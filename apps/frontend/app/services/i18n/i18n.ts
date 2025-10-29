export default {
  // Supported languages
  supportedLngs: ['en', 'de'],

  // Fallback language when translation missing
  fallbackLng: 'en',

  // Default namespace (loaded on every page)
  defaultNS: 'common',

  // React-specific options
  react: {
    useSuspense: false, // Critical for Remix SSR
  },

  // Interpolation settings
  interpolation: {
    escapeValue: false, // React already escapes
  },
};
