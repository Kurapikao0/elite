import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { authorized, json } from './lib/security';

const images = getStore('elite-site-images');
const videos = getStore('elite-site-videos');
const IMAGE_MAX_SIZE = 4 * 1024 * 1024;
const VIDEO_MAX_SIZE = 256 * 1024 * 1024;
const VIDEO_CHUNK_SIZE = 4 * 1024 * 1024;
const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/gif': (b) => new TextDecoder().decode(b.slice(0, 6)).startsWith('GIF8'),
  'image/webp': (b) => new TextDecoder().decode(b.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(b.slice(8, 12)) === 'WEBP',
};
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
const videoTypes: Record<string, { extension: string; signature: (bytes: Uint8Array) => boolean }> = {
  'video/mp4': { extension: 'mp4', signature: (bytes) => bytes.length >= 8 && new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp' },
  'video/webm': { extension: 'webm', signature: (bytes) => bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3 },
  'video/ogg': { extension: 'ogg', signature: (bytes) => bytes.length >= 4 && new TextDecoder().decode(bytes.slice(0, 4)) === 'OggS' },
};

function binary(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function validVideoId(value: string | null): value is string {
  return Boolean(value && /^[a-f0-9]{32}$/.test(value));
}

async function saveVideoPart(request: Request) {
  const uploadId = request.headers.get('x-upload-id');
  const partIndex = Number(request.headers.get('x-upload-part-index'));
  const partCount = Number(request.headers.get('x-upload-part-count'));
  const fileSize = Number(request.headers.get('x-upload-file-size'));
  const type = request.headers.get('x-upload-content-type')?.toLowerCase() ?? '';
  const videoType = videoTypes[type];
  if (!validVideoId(uploadId) || !videoType || !Number.isInteger(partIndex) || !Number.isInteger(partCount)
    || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > VIDEO_MAX_SIZE
    || partCount !== Math.ceil(fileSize / VIDEO_CHUNK_SIZE) || partIndex < 0 || partIndex >= partCount) {
    return json({ error: 'بيانات رفع الفيديو غير صالحة أو تجاوز الفيديو الحد الأقصى (256 ميغابايت).' }, 400);
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  const expectedSize = partIndex === partCount - 1 ? fileSize - partIndex * VIDEO_CHUNK_SIZE : VIDEO_CHUNK_SIZE;
  if (bytes.byteLength !== expectedSize) return json({ error: 'حجم جزء الفيديو لا يطابق بيانات الرفع.' }, 400);
  if (partIndex === 0 && !videoType.signature(bytes)) return json({ error: 'محتوى الملف لا يطابق صيغة الفيديو المحددة.' }, 415);
  const key = `parts/${uploadId}/${String(partIndex).padStart(6, '0')}`;
  await videos.set(key, binary(bytes), { metadata: { contentType: type, size: bytes.byteLength } });
  return json({ ok: true, partIndex }, 201);
}

async function finalizeVideo(request: Request) {
  let body: { uploadId?: string; fileName?: string; contentType?: string; fileSize?: number; partCount?: number };
  try { body = await request.json() as typeof body; } catch { return json({ error: 'بيانات إكمال رفع الفيديو غير صالحة.' }, 400); }
  const { uploadId, fileName, contentType, fileSize, partCount } = body;
  if (!validVideoId(uploadId ?? null) || !fileName || fileName.length > 255
    || !contentType || !videoTypes[contentType] || !Number.isInteger(fileSize) || fileSize! < 1 || fileSize! > VIDEO_MAX_SIZE
    || partCount !== Math.ceil(fileSize! / VIDEO_CHUNK_SIZE)) return json({ error: 'بيانات الفيديو لا تطابق عملية الرفع.' }, 400);

  for (let index = 0; index < partCount!; index++) {
    const key = `parts/${uploadId}/${String(index).padStart(6, '0')}`;
    const part = await videos.getMetadata(key, { consistency: 'strong' });
    const expectedSize = index === partCount! - 1 ? fileSize! - index * VIDEO_CHUNK_SIZE : VIDEO_CHUNK_SIZE;
    if (!part || Number(part.metadata?.size) !== expectedSize || part.metadata?.contentType !== contentType) {
      return json({ error: 'لم تكتمل جميع أجزاء الفيديو؛ أعد محاولة الرفع.' }, 400);
    }
  }

  const manifest = { fileName: fileName.replace(/[\\/\u0000-\u001f]/g, '_'), contentType, fileSize: fileSize!, partCount: partCount!, chunkSize: VIDEO_CHUNK_SIZE };
  await videos.setJSON(`manifests/${uploadId}`, manifest);
  return json({ url: `/api/image/${uploadId}.${videoTypes[contentType].extension}` }, 201);
}

async function saveSmallVideo(file: File, type: string) {
  if (!file.size || file.size > VIDEO_CHUNK_SIZE) return json({ error: 'ارفع الفيديو من الواجهة؛ تدعم الواجهة الرفع المجزأ للفيديو حتى 256 ميغابايت.' }, 413);
  const videoType = videoTypes[type];
  if (!videoType) return json({ error: 'الصيغ المدعومة للفيديو MP4 وWebM وOGG.' }, 415);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!videoType.signature(bytes)) return json({ error: 'محتوى الملف لا يطابق صيغة الفيديو المحددة.' }, 415);
  const uploadId = randomBytes(16).toString('hex');
  await videos.set(`parts/${uploadId}/000000`, binary(bytes), { metadata: { contentType: type, size: bytes.byteLength } });
  await videos.setJSON(`manifests/${uploadId}`, { fileName: file.name, contentType: type, fileSize: file.size, partCount: 1, chunkSize: VIDEO_CHUNK_SIZE });
  return json({ url: `/api/image/${uploadId}.${videoType.extension}` }, 201);
}

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  if (!(await authorized(request))) return json({ error: 'تسجيل الدخول أو التحقق الأمني مطلوب.' }, 401);
  try {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (contentType.startsWith('application/json')) {
      let body: { action?: string };
      try { body = await request.clone().json() as { action?: string }; } catch { return json({ error: 'صيغة طلب الرفع غير صالحة.' }, 400); }
      if (body.action === 'finalize-video') return await finalizeVideo(request);
    }
    if (contentType.startsWith('application/octet-stream')) return await saveVideoPart(request);

    let form: FormData;
    try { form = await request.formData(); } catch { return json({ error: 'صيغة رفع غير صالحة.' }, 400); }
    const file = form.get('image') ?? form.get('file');
    if (!(file instanceof File)) return json({ error: 'لم يتم استلام ملف صالح.' }, 400);
    const type = file.type.toLowerCase();
    if (videoTypes[type]) return await saveSmallVideo(file, type);
    if (!signatures[type]) return json({ error: 'الصيغ المدعومة للصور JPG وPNG وWebP وGIF، وللفيديو MP4 وWebM وOGG.' }, 415);
    if (!file.size || file.size > IMAGE_MAX_SIZE) return json({ error: 'الحد الأقصى لحجم الصورة 4 ميغابايت لتوافق حد طلبات Netlify.' }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!signatures[type](bytes)) return json({ error: 'محتوى الصورة لا يطابق نوع الملف.' }, 415);
    const key = `${randomBytes(20).toString('hex')}.${extensions[type]}`;
    await images.set(key, binary(bytes), { metadata: { contentType: type } });
    return json({ url: `/api/image/${key}` }, 201);
  } catch (error) {
    console.error('Media upload failed:', error);
    return json({ error: 'تعذر حفظ الملف في Netlify Blobs. تحقق من اتصال التخزين ثم أعد المحاولة.' }, 500);
  }
};
