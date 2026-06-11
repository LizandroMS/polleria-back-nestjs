import type { NextFunction, Request, Response } from 'express';

/**
 * Nota para mí:
 * Agrego cabeceras básicas de seguridad sin depender de librerías externas.
 * Esto no reemplaza WAF/CDN, pero ayuda a reducir exposición del backend ante
 * ataques comunes y evita que se filtren detalles innecesarios del servidor.
 */
export function securityHeadersMiddleware(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.removeHeader('X-Powered-By');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
}
