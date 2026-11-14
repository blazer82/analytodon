export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
] as const;

export const DEFAULT_LANGUAGE = 'en';

export type SupportedLanguage = (typeof AVAILABLE_LANGUAGES)[number]['code'];
