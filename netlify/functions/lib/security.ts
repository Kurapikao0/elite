import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'elite_admin';
type Session = { expires: number; csrf: string };
const cookieSecurity = () => process.env.NETLIFY_DEV === 'true' ? '' : '; Secure';
function secret() {
  const value = process.env.ELITE_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ELITE_SESSION_SECRET must be set to a random value of at least 32 characters.');
  return value;
}
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
export function issueSession() {
  const payload: Session = { expires: Date.now() + 8 * 60 * 60 * 1000, csrf: randomBytes(32).toString('base64url') };
  const value = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { csrf: payload.csrf, cookie: `${COOKIE_NAME}=${value}.${sign(value)}; Path=/; HttpOnly${cookieSecurity()}; SameSite=Strict; Max-Age=28800` };
}
export function clearSession() { return `${COOKIE_NAME}=; Path=/; HttpOnly${cookieSecurity()}; SameSite=Strict; Max-Age=0`; }
export function verifySession(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const encoded = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!encoded) return null;
  const separator = encoded.lastIndexOf('.');
  if (separator < 1) return null;
  const payload = encoded.slice(0, separator);
  const signature = encoded.slice(separator + 1);
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (session.expires < Date.now()) return null;
    return session;
  } catch { return null; }
}
export async function authorized(request: Request) {
  const session = verifySession(request);
  if (!session) return false;
  const token = request.headers.get('x-csrf-token') ?? '';
  return token.length === session.csrf.length && timingSafeEqual(Buffer.from(token), Buffer.from(session.csrf));
}
export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...Object.fromEntries(new Headers(headers)) } });
}
