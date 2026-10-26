import { getStore } from '@netlify/blobs';
import { json } from './lib/security';

const images = getStore('elite-site-images');
const videos = getStore('elite-site-videos');
const MAX_VIDEO_RESPONSE = 8 * 1024 * 1024;

function unavailableRange(size: number) {
  return new Response(null, { status: 416, headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes */${size}`, 'Cache-Control': 'no-store' } });
}

async function serveVideo(request: Request, id: string, method: 'GET' | 'HEAD') {
  const manifest = await videos.get(`manifests/${id}`, { type: 'json', consistency: 'strong' }) as { fileSize?: number; partCount?: number; chunkSize?: number; contentType?: string } | null;
  if (!manifest || !Number.isSafeInteger(manifest.fileSize) || !Number.isInteger(manifest.partCount)
    || !Number.isInteger(manifest.chunkSize) || typeof manifest.contentType !== 'string') return json({ error: 'الفيديو غير موجود.' }, 404);
  const size = manifest.fileSize!;
  const chunkSize = manifest.chunkSize!;
  const rangeHeader = request.headers.get('range');
  let start = 0;
  let end = size - 1;
  let partial = false;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match || (!match[1] && !match[2])) return unavailableRange(size);
    partial = true;
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : size - 1;
    } else {
      const suffixLength = Number(match[2]);
      if (!suffixLength) return unavailableRange(size);
      start = Math.max(0, size - suffixLength);
    }
  } else if (size > MAX_VIDEO_RESPONSE) {
    return unavailableRange(size);
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return unavailableRange(size);
  end = Math.min(end, size - 1, start + MAX_VIDEO_RESPONSE - 1);

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Length': String(end - start + 1),
    'Content-Type': manifest.contentType,
    'X-Content-Type-Options': 'nosniff',
  });
  if (partial) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  if (method === 'HEAD') return new Response(null, { status: partial ? 206 : 200, headers });

  const firstPart = Math.floor(start / chunkSize);
  const lastPart = Math.floor(end / chunkSize);
  const output = new Uint8Array(end - start + 1);
  let outputOffset = 0;
  for (let index = firstPart; index <= lastPart; index++) {
    const key = `parts/${id}/${String(index).padStart(6, '0')}`;
    const part = await videos.get(key, { type: 'arrayBuffer', consistency: 'strong' });
    if (!(part instanceof ArrayBuffer)) return json({ error: 'جزء من الفيديو غير متاح.' }, 404);
    const bytes = new Uint8Array(part);
    const from = index === firstPart ? start % chunkSize : 0;
    const to = Math.min(bytes.length, end - index * chunkSize + 1);
    output.set(bytes.subarray(from, to), outputOffset);
    outputOffset += to - from;
  }
  return new Response(output, { status: partial ? 206 : 200, headers });
}

export default async (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
  const key = new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? '';
  try {
    const videoMatch = /^([a-f0-9]{32})\.(mp4|webm|ogg)$/.exec(key);
    if (videoMatch) return await serveVideo(request, videoMatch[1], request.method);
    if (!/^[a-f0-9]{40}\.(jpg|png|gif|webp)$/.test(key)) return json({ error: 'الملف غير موجود.' }, 404);
    const image = await images.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!image) return json({ error: 'الصورة غير موجودة.' }, 404);
    const contentType = typeof image.metadata?.contentType === 'string' ? image.metadata.contentType : 'application/octet-stream';
    const headers = new Headers({ 'Content-Type': contentType, 'Content-Length': String(image.data.byteLength), 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    return new Response(request.method === 'HEAD' ? null : image.data, { headers });
  } catch (error) {
    console.error('Media retrieval failed:', error);
    return json({ error: 'تعذر قراءة الملف من Netlify Blobs.' }, 500);
  }
};
