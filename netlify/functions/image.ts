import { getStore } from '@netlify/blobs';
import { json } from './lib/security';

const images = getStore('elite-site-images');
export default async (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
  const key = new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? '';
  if (!/^[a-f0-9]{40}\.(jpg|png|gif|webp)$/.test(key)) return json({ error: 'الصورة غير موجودة.' }, 404);
  const image = await images.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!image) return json({ error: 'الصورة غير موجودة.' }, 404);
  const contentType = typeof image.metadata?.contentType === 'string' ? image.metadata.contentType : 'application/octet-stream';
  const headers = new Headers({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  return new Response(request.method === 'HEAD' ? null : image.data, { headers });
};
