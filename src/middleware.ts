import Elysia from 'elysia';
import { sanitizeIP } from './utils';

export const ipGetter = new Elysia({ name: 'ip-getter' }).derive({ as: 'global' }, ({ request }) => {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const rawIp = forwarded?.split(',')[0].trim() || realIp || 'unknown';
  const ip = sanitizeIP(rawIp);
  const startTime = Date.now();

  return { ip, startTime };
});
