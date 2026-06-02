export const PROJECT_CODES = {
  /** Proyecto actual de pollería. Mantengo este valor como default para no romper el flujo productivo. */
  POLLERIA: 'POL',
  /** Proyecto futuro de tienda de ropa online que usará el mismo backend de autenticación. */
  ROPA: 'ROP',
} as const;

export type ProjectCode = (typeof PROJECT_CODES)[keyof typeof PROJECT_CODES];

export const DEFAULT_PROJECT_CODE: ProjectCode = PROJECT_CODES.POLLERIA;

export const SUPPORTED_PROJECT_CODES: ProjectCode[] = [
  PROJECT_CODES.POLLERIA,
  PROJECT_CODES.ROPA,
];
