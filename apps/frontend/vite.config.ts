import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

declare module '@remix-run/node' {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      serverModuleFormat: 'esm',
      ignoredRouteFiles: ['**/*.test.ts', '**/*.test.tsx'],
    }),
    tsconfigPaths(),
  ],
  ssr: {
    noExternal: ['remix-i18next'],
  },
  optimizeDeps: {
    include: ['react-i18next', 'i18next'],
    exclude: ['i18next-fs-backend', 'remix-i18next'],
  },
});
