import { getStore } from '@netlify/blobs';
import { authorized, json } from './lib/security';

const store = getStore('elite-site-content');
export default async (request: Request) => {
  try {
    if (request.method === 'GET') {
      const content = await store.get('content', { type: 'json', consistency: 'strong' });
      return json({ content: content ?? null });
    }
    if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, PUT' });
    if (!(await authorized(request))) return json({ error: 'تسجيل الدخول أو التحقق الأمني مطلوب.' }, 401);
    const raw = await request.text();
    if (raw.length > 2_000_000) return json({ error: 'محتوى كبير جداً.' }, 413);
    let content: unknown;
    try { content = JSON.parse(raw); } catch { return json({ error: 'صيغة المحتوى غير صالحة.' }, 400); }
    await store.setJSON('content', content);
    return json({ ok: true });
  } catch (error) {
    console.error('Content storage failed:', error);
    return json({ error: 'تعذر قراءة المحتوى أو حفظه في Netlify Blobs.' }, 500);
  }
};
