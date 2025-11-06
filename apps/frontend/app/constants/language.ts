export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
] as const;

export const DEFAULT_LANGUAGE = 'en';

export type SupportedLanguage = (typeof AVAILABLE_LANGUAGES)[number]['code'];
