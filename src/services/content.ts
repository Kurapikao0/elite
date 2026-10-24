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

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData(); form.append('image', file);
  const response = await fetch('api/upload.php', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrfToken }, body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'تعذر رفع الصورة.');
  return result.url as string;
}
