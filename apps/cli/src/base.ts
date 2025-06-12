import { Command } from '@oclif/core';
import pino from 'pino';

export abstract class BaseCommand extends Command {
  // Create our own pino logger instance
  private pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'info', // Default to 'info' unless overridden
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            // Use pino-pretty for development environments
            target: 'pino-pretty',
          },
  });

  log(message?: string, ...args: any[]): void {
    // Use our pino logger
    this.pinoLogger.info(message, ...args);
  }

  // Add custom `warn` method because oclif has a different signature
  logWarning(input: string | Error): void {
    if (typeof input === 'string') {
      this.pinoLogger.warn(input);
    }
    // If it's an error object
    this.pinoLogger.warn(input);
  }

  // Add custom `error` method because oclif was exiting on any error
  logError(input: string | Error): void {
    if (typeof input === 'string') {
      this.pinoLogger.warn(input);
    }
    // If it's an error object
    this.pinoLogger.error(input);
  }

  // Override `error` to use our pino logger and preserve oclif's exit behavior
  error(input: string | Error, options: { code?: string; exit: false }): void;
  error(input: string | Error, options?: { code?: string; exit?: number }): never;
  error(input: string | Error, options: { code?: string; exit?: number | false } = {}): void | never {
    if (typeof input === 'string') {
      this.pinoLogger.error(input);
    } else {
      this.pinoLogger.error(input);
    }

    const exitCode = options.exit === undefined ? 1 : options.exit;
    if (exitCode !== false) {
      this.exit(exitCode);
    }
  }

  // Override `logToStderr` for completeness
  logToStderr(message?: string, ...args: any[]): void {
    this.pinoLogger.warn(`STDERR: ${message}`, ...args);
  }
}
