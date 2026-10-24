import { randomBytes } from 'node:crypto';
import { authorized, json } from './lib/security';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  'image/gif': (bytes) => new TextDecoder().decode(bytes.slice(0, 6)).startsWith('GIF8'),
  'image/webp': (bytes) => new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP',
};
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !owner || !repo) throw new Error('يلزم إعداد GITHUB_TOKEN وGITHUB_OWNER وGITHUB_REPO في متغيرات Netlify.');
  return { token, owner, repo, branch };
}

async function githubRequest(path: string, init?: RequestInit): Promise<Response> {
  const { token, owner, repo } = githubConfig();
  return fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  });
}

async function readCards(): Promise<unknown> {
  const { branch } = githubConfig();
  const response = await githubRequest(`src/data/cards.json?ref=${encodeURIComponent(branch)}`);
  if (!response.ok) throw new Error(response.status === 404 ? 'لم يُعثر على src/data/cards.json في المستودع.' : 'تعذر قراءة البطاقات من GitHub.');
  const file = await response.json() as { content: string; encoding: string };
  if (file.encoding !== 'base64') throw new Error('صيغة ملف البطاقات غير مدعومة.');
  return JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')) as unknown;
}

function validCards(value: unknown): value is { id: string; title: string; description: string; imageUrl: string }[] {
  if (!Array.isArray(value) || value.length > 200) return false;
  const ids = new Set<string>();
  return value.every((card: unknown) => {
    if (!card || typeof card !== 'object') return false;
    const item = card as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id || item.id.length > 100 || ids.has(item.id)
      || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300
      || typeof item.description !== 'string' || item.description.length > 5000
      || typeof item.imageUrl !== 'string' || !item.imageUrl.trim() || item.imageUrl.length > 2000) return false;
    ids.add(item.id);
    return true;
  });
}

async function writeFile(path: string, contents: Uint8Array, message: string): Promise<void> {
  const { branch } = githubConfig();
  const current = await githubRequest(`${path}?ref=${encodeURIComponent(branch)}`);
  let sha: string | undefined;
  if (current.ok) sha = (await current.json() as { sha: string }).sha;
  else if (current.status !== 404) throw new Error('تعذر التحقق من الملف الحالي على GitHub.');
  const response = await githubRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: Buffer.from(contents).toString('base64'), branch, ...(sha ? { sha } : {}) }),
  });
  if (!response.ok) throw new Error(response.status === 409 || response.status === 422 ? 'تغير الملف على GitHub بالتزامن. أعد تحميل الصفحة وحاول مجدداً.' : 'رفض GitHub حفظ الملف. تحقق من صلاحيات Contents للتوكن.');
}

export default async (request: Request) => {
  try {
    if (request.method === 'GET') return json(await readCards());
    if (request.method !== 'PUT' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, PUT, POST' });
    if (!(await authorized(request))) return json({ error: 'تسجيل الدخول أو التحقق الأمني مطلوب.' }, 401);

    if (request.method === 'PUT') {
      let cards: unknown;
      try { cards = await request.json(); } catch { return json({ error: 'صيغة بيانات البطاقات غير صالحة.' }, 400); }
      if (!validCards(cards)) return json({ error: 'تحقق من حقول البطاقات وتأكد من عدم تكرار المعرّفات.' }, 400);
      await writeFile('src/data/cards.json', new TextEncoder().encode(JSON.stringify(cards, null, 2) + '\n'), 'Update cards from admin dashboard');
      return json({ ok: true });
    }

    let form: FormData;
    try { form = await request.formData(); } catch { return json({ error: 'صيغة رفع غير صالحة.' }, 400); }
    const file = form.get('image');
    if (!(file instanceof File)) return json({ error: 'لم يتم استلام صورة.' }, 400);
    if (!file.size || file.size > MAX_IMAGE_SIZE) return json({ error: 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت.' }, 413);
    const type = file.type.toLowerCase();
    if (!signatures[type]) return json({ error: 'الصيغ المدعومة JPG وPNG وWebP وGIF.' }, 415);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!signatures[type](bytes)) return json({ error: 'محتوى الصورة لا يطابق نوع الملف.' }, 415);
    const { owner, repo, branch } = githubConfig();
    const filename = `${randomBytes(16).toString('hex')}.${extensions[type]}`;
    const path = `public/images/${filename}`;
    await writeFile(path, bytes, `Upload card image ${filename}`);
    return json({ url: `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${branch}/${path}` }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'تعذر إتمام طلب GitHub.' }, 502);
  }
};