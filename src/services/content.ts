import { defaultContent, type SiteContent } from '../data/defaultContent';

const API = 'api/content.php';
let csrfToken = '';
export function setCsrfToken(token: string) { csrfToken = token; }
export async function loadContent(): Promise<SiteContent> {
  try {
    const response = await fetch(`${API}?v=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json() as { content?: SiteContent };
      if (result.content) return result.content;
    }
  } catch { /* local development can run without Apache/PHP */ }
  return defaultContent;
}

export async function saveContent(content: SiteContent): Promise<void> {
  const response = await fetch(API, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(content) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'تعذر حفظ المحتوى.');
}

const VIDEO_CHUNK_SIZE = 4 * 1024 * 1024;
const MAX_VIDEO_SIZE = 256 * 1024 * 1024;
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg']);

async function uploadResult(response: Response): Promise<{ url?: string; error?: string }> {
  const result = await response.json().catch(() => null) as { url?: string; error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? `تعذر رفع الملف (HTTP ${response.status}).`);
  return result ?? {};
}

export async function uploadMedia(file: File, token = csrfToken): Promise<string> {
  if (VIDEO_TYPES.has(file.type.toLowerCase())) {
    if (!file.size || file.size > MAX_VIDEO_SIZE) throw new Error('الحد الأقصى لحجم الفيديو 256 ميغابايت.');
    const uploadId = crypto.randomUUID().replace(/-/g, '').toLowerCase();
    const partCount = Math.ceil(file.size / VIDEO_CHUNK_SIZE);
    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const chunk = await file.slice(partIndex * VIDEO_CHUNK_SIZE, Math.min(file.size, (partIndex + 1) * VIDEO_CHUNK_SIZE)).arrayBuffer();
      const response = await fetch('api/upload.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-CSRF-Token': token,
          'X-Upload-Id': uploadId,
          'X-Upload-Part-Index': String(partIndex),
          'X-Upload-Part-Count': String(partCount),
          'X-Upload-File-Size': String(file.size),
          'X-Upload-Content-Type': file.type.toLowerCase(),
        },
        body: chunk,
      });
      await uploadResult(response);
    }
    const completed = await fetch('api/upload.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ action: 'finalize-video', uploadId, fileName: file.name, contentType: file.type.toLowerCase(), fileSize: file.size, partCount }),
    });
    const result = await uploadResult(completed);
    if (!result.url) throw new Error('لم يُرجع الخادم رابط الفيديو بعد اكتمال الرفع.');
    return result.url;
  }

  if (file.size > 4 * 1024 * 1024) throw new Error('الحد الأقصى لحجم الصورة 4 ميغابايت.');
  const form = new FormData();
  form.append('image', file);
  const response = await fetch('api/upload.php', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token }, body: form });
  const result = await uploadResult(response);
  if (!result.url) throw new Error('لم يُرجع الخادم رابط الصورة بعد اكتمال الرفع.');
  return result.url;
}

export async function uploadImage(file: File): Promise<string> {
  return uploadMedia(file);
}
