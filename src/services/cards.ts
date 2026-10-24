import starterCards from '../data/cards.json';

export type CardItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

const API = '/.netlify/functions/cards';

export async function loadCards(): Promise<CardItem[]> {
  try {
    const response = await fetch(`${API}?v=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) return await response.json() as CardItem[];
  } catch { /* Vite without Netlify Dev uses the bundled starter data. */ }
  return starterCards;
}

export async function saveCards(cards: CardItem[], csrfToken: string): Promise<void> {
  const response = await fetch(API, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(cards),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'تعذر حفظ البطاقات على GitHub.');
}

export async function uploadCardImage(file: File, csrfToken: string): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const response = await fetch(API, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrfToken },
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'تعذر رفع الصورة إلى GitHub.');
  return result.url as string;
}