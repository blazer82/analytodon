import createCache from '@emotion/cache';

// On the client, we want to insert styles right after the emotion insertion point
export function createEmotionCache() {
  const isBrowser = typeof document !== 'undefined';

  if (isBrowser) {
    const emotionInsertionPoint = document.querySelector<HTMLMetaElement>('meta[name="emotion-insertion-point"]');
    return createCache({
      key: 'css',
      insertionPoint: emotionInsertionPoint ?? undefined,
    });
  }

  // On the server, just create a simple cache
  return createCache({ key: 'css' });
}
