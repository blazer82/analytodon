import { Command } from '@oclif/core';
import pino from 'pino';

export abstract class BaseCommand extends Command {
  // Create our own pino logger instance
  private pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'info', // Default to 'info' unless overridden
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

  // Override `warn` to use our pino logger
  // Must match the base class signature: `warn(input: string | Error): string | Error;`
  warn(input: string | Error): string | Error {
    if (typeof input === 'string') {
      this.pinoLogger.warn(input);
      return input;
    }
    // If it's an error object
    this.pinoLogger.warn(input);
    return input;
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
