import { format } from 'node:util';
import { Interfaces } from '@oclif/core';
import pino from 'pino';

const pinoInstance = pino({
  level: process.env.LOG_LEVEL || 'info', // Default to 'info' unless overridden
  transport: {
    target: 'pino-pretty',
  },
});

export const customLogger = (namespace: string): Interfaces.Logger => {
  // This oclif logger wrapper will use a single pinoInstance.
  // The namespace is managed by the wrapper as in the oclif example.
  // If pino-specific child loggers with their own context/bindings are needed,
  // pinoInstance.child({ module: namespace }) could be used within this function.
  return {
    child: (ns: string, delimiter?: string) => customLogger(`${namespace}${delimiter ?? ':'}${ns}`),
    // Pass the formatted string to pino, as per the oclif example's pattern.
    // This ensures that the message passed to pino is always a string.
    debug: (formatter: unknown, ...args: unknown[]) => pinoInstance.debug(format(formatter, ...args)),
    error: (formatter: unknown, ...args: unknown[]) => pinoInstance.error(format(formatter, ...args)),
    info: (formatter: unknown, ...args: unknown[]) => pinoInstance.info(format(formatter, ...args)),
    trace: (formatter: unknown, ...args: unknown[]) => pinoInstance.trace(format(formatter, ...args)), // Pino supports trace level
    warn: (formatter: unknown, ...args: unknown[]) => pinoInstance.warn(format(formatter, ...args)),
    namespace,
  };
};

// Export a default logger instance for the CLI, using 'cli' as the root namespace.
export const logger = customLogger('cli');
