import pino from 'pino';

/**
 * Centralized pino logger singleton.
 *
 * - Development  (NODE_ENV !== 'production'): human-readable colored output via pino-pretty
 * - Production   (NODE_ENV === 'production'): structured JSON to stdout — Render captures it automatically
 *
 * Log level can be overridden via the LOG_LEVEL env var (default: 'info').
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: { service: 'cat-loan-saas' },
    timestamp: pino.stdTimeFunctions.isoTime
  },
  process.env.NODE_ENV !== 'production'
    ? (pino as any).transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname,service,req,res,responseTime'
        }
      })
    : undefined
);
