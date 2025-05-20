/**
 * Global type definitions for the application
 */

import type { Session } from '@remix-run/node';

// Augment the Remix Request interface to include our custom session property
declare global {
  interface Request {
    __apiClientSession?: Session;
  }
}

export {};
