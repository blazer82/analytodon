import pino from 'pino';

// Create a Pino logger instance
// dd-trace will automatically patch this instance if initialized before it
const baseLogger = pino({
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  level: process.env.LOG_LEVEL || 'info',
});

// Export logger with helper methods
const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      baseLogger.info(meta, message);
    } else {
      baseLogger.info(message);
    }
  },

  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    const logObject = { ...meta };
    if (error instanceof Error) {
      // Pino automatically handles Error objects when passed as the first argument
      baseLogger.error(error, message);
    } else if (error) {
      // If error is not an Error object, include it in the meta
      baseLogger.error({ ...logObject, errorDetail: error }, message);
    } else {
      baseLogger.error(logObject, message);
    }
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      baseLogger.warn(meta, message);
    } else {
      baseLogger.warn(message);
    }
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      baseLogger.debug(meta, message);
    } else {
      baseLogger.debug(message);
    }
  },
};

export default logger;
