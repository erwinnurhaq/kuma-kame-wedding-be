import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { APP_CONFIG } from './config';
import { ipGetter } from './middleware';
import { logger } from './logger';
import { api } from './api';

new Elysia({
  sanitize: (value) => (typeof value === 'string' ? Bun.escapeHTML(value) : value),
})
  // Global error handler
  .onError(({ code, error, set, request }) => {
    const path = new URL(request.url).pathname;

    logger.error('Request error', error, {
      code,
      path,
      method: request.method,
    });

    // Handle specific error codes
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        error: 'Validation error',
        message: 'Invalid request data',
      };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        error: 'Not found',
        message: 'The requested resource was not found',
      };
    }

    if (code === 'PARSE') {
      set.status = 400;
      return {
        error: 'Parse error',
        message: 'Invalid JSON format',
      };
    }

    if (code === 'UNKNOWN') {
      set.status = 500;
      return {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      };
    }

    // Default error response (don't leak error details)
    set.status = 500;
    return {
      error: 'Internal server error',
      message: 'Something went wrong',
    };
  })

  // CORS configuration
  .use(
    cors({
      origin: APP_CONFIG.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
      maxAge: 86400, // Cache preflight for 24 hours
    })
  )

  // Derive IP and start time for logging
  .use(ipGetter)

  // Log all requests
  .onAfterHandle(({ request, set, ip, startTime }) => {
    const duration = Date.now() - startTime;
    const path = new URL(request.url).pathname;
    const statusCode = typeof set.status === 'number' ? set.status : 200;
    const statusString = typeof set.status === 'string' ? set.status : undefined;
    logger.logRequest(request.method, path, ip, statusCode, statusString, duration);
  })

  .use(api)
  .listen(APP_CONFIG.PORT);

logger.info('Server started', {
  port: APP_CONFIG.PORT,
  env: APP_CONFIG.ENV,
});
