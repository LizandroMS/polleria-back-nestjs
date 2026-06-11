import type { Request } from 'express';

/**
 * Nota para mí:
 * Railway, Vercel y otros proxies envían la IP real en cabeceras como
 * x-forwarded-for. Nunca debo confiar solo en req.ip porque puede devolver
 * la IP interna del proxy y el limitador quedaría agrupando usuarios reales.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers['x-real-ip'];

  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim();
  }

  return request.ip || request.socket.remoteAddress || 'unknown';
}
