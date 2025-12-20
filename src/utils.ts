export function generateUUID(): string {
  return crypto.randomUUID();
}

export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

export function sanitizeIP(ip: string): string {
  // Validate and sanitize IP address
  if (!ip || typeof ip !== 'string') {
    return 'localhost';
  }

  // Remove whitespace
  ip = ip.trim();

  // Handle localhost variations
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1' || ip === 'localhost') {
    return 'localhost';
  }

  // Limit length (IPv6 max is 45 chars)
  if (ip.length > 45) {
    return 'unknown';
  }

  // Basic validation for IPv4 or IPv6
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;

  if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
    return ip;
  }

  return 'unknown';
}
