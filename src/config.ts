export const APP_CONFIG = {
  PORT: process.env.PORT || 3000,
  ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*', // Adjust in production
} as const;

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  MIN_LIMIT: 5,
} as const;

export const SECURITY_CONFIG = {
  MAX_NAME_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 500,
  MAX_TOTAL_GUESTS: 20,
  RATE_LIMIT_READ: 60, // requests per minute
  RATE_LIMIT_WRITE: 10, // requests per minute
  RATE_LIMIT_WINDOW: 60000, // 1 minute in ms
} as const;
