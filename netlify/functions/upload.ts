import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { authorized, json } from './lib/security';

const images = getStore('elite-site-images');
const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/gif': (b) => new TextDecoder().decode(b.slice(0, 6)).startsWith('GIF8'),
  'image/webp': (b) => new TextDecoder().decode(b.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(b.slice(8, 12)) === 'WEBP',
};
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  if (!(await authorized(request))) return json({ error: 'تسجيل الدخول أو التحقق الأمني مطلوب.' }, 401);
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: 'صيغة رفع غير صالحة.' }, 400); }
  const file = form.get('image');
  if (!(file instanceof File)) return json({ error: 'لم يتم استلام صورة.' }, 400);
  if (file.size > 5 * 1024 * 1024) return json({ error: 'الحد الأقصى لحجم الصورة 5 ميغابايت.' }, 413);
  const type = file.type.toLowerCase();
  if (!signatures[type]) return json({ error: 'الصيغ المدعومة JPG وPNG وWebP وGIF.' }, 415);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatures[type](bytes)) return json({ error: 'محتوى الصورة لا يطابق نوع الملف.' }, 415);
  const key = `${randomBytes(20).toString('hex')}.${extensions[type]}`;
  const binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  await images.set(key, binary, { metadata: { contentType: type } });
  return json({ url: `/api/image/${key}` }, 201);
};
