/**
 * Global type definitions for the application
 */

declare global {
  interface Window {
    ENV: {
      MARKETING_URL: string;
      SUPPORT_EMAIL: string;
    };
  }
}

export {};
