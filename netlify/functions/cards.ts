import { getStore } from '@netlify/blobs';
import starterCards from '../../src/data/cards.json';
import { authorized, json } from './lib/security';

const store = getStore('elite-site-content');

type Card = { id: string; title: string; description: string; imageUrl: string };

function validCards(value: unknown): value is Card[] {
  if (!Array.isArray(value) || value.length > 200) return false;
  const ids = new Set<string>();
  return value.every((card: unknown) => {
    if (!card || typeof card !== 'object') return false;
    const item = card as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id || item.id.length > 100 || ids.has(item.id)
      || typeof item.title !== 'string' || item.title.length > 300
      || typeof item.description !== 'string' || item.description.length > 5000
      || typeof item.imageUrl !== 'string' || item.imageUrl.length > 2000) return false;
    ids.add(item.id);
    return true;
  });
}

export default async (request: Request) => {
  try {
    if (request.method === 'GET') {
      const saved = await store.get('cards', { type: 'json', consistency: 'strong' }) as unknown;
      return json(saved === null ? starterCards : saved);
    }
    if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, PUT' });
    if (!(await authorized(request))) return json({ error: 'تسجيل الدخول أو التحقق الأمني مطلوب.' }, 401);

    let cards: unknown;
    try { cards = await request.json(); } catch { return json({ error: 'صيغة بيانات البطاقات غير صالحة.' }, 400); }
    if (!validCards(cards)) return json({ error: 'تحقق من حقول البطاقات وتأكد من عدم تكرار المعرّفات.' }, 400);
    await store.setJSON('cards', cards);
    return json({ ok: true });
  } catch (error) {
    console.error('Cards storage failed:', error);
    return json({ error: 'تعذر قراءة البطاقات أو حفظها في Netlify Blobs.' }, 500);
  }
};
