import { clearSession, issueSession, json, verifySession } from './lib/security';

function localDevBypass(request: Request) {
  if (process.env.NETLIFY_DEV !== 'true' || process.env.ELITE_DEV_ADMIN_BYPASS !== 'true') return false;
  const hostname = new URL(request.url).hostname;
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

export default async (request: Request) => {
  if (request.method === 'GET') {
    if (localDevBypass(request)) {
      try {
        const session = issueSession();
        return json({ authenticated: true, csrf: session.csrf }, 200, { 'Set-Cookie': session.cookie });
      } catch (error) {
        console.error(error);
        return json({ error: 'إعدادات جلسة الإدارة غير مكتملة.' }, 503);
      }
    }
    const session = verifySession(request);
    return json({ authenticated: Boolean(session), csrf: session?.csrf ?? null });
  }
  if (request.method === 'DELETE') return json({ ok: true }, 200, { 'Set-Cookie': clearSession() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, DELETE' });
  const expected = process.env.ELITE_ADMIN_PASSWORD;
  if (!expected) return json({ error: 'يلزم إعداد كلمة مرور الإدارة في متغيرات Netlify.' }, 503);
  let body: { password?: string };
  try { body = await request.json() as { password?: string }; } catch { return json({ error: 'طلب غير صالح.' }, 400); }
  if (!body.password || body.password.length > 200 || body.password !== expected) return json({ error: 'بيانات الدخول غير صحيحة.' }, 401);
  try {
    const session = issueSession();
    return json({ csrf: session.csrf }, 200, { 'Set-Cookie': session.cookie });
  } catch (error) {
    console.error(error);
    return json({ error: 'إعدادات جلسة الإدارة غير مكتملة.' }, 503);
  }
};
