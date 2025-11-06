/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import i18nextConfig from '~/services/i18n/i18n';
import i18next from '~/services/i18n/i18next.server';
import logger from '~/services/logger.server';
import { createInstance } from 'i18next';
import Backend from 'i18next-fs-backend';
import { isbot } from 'isbot';

import { createEmotionCache } from './utils/createEmotionCache';

const ABORT_DELAY = 5_000;

/**
 * Get the correct path to translation files based on environment
 * In development: ./public/locales/
 * In production: ./build/client/locales/
 */
function getLocalesPath(): string {
  const prodPath = resolve('./build/client/locales');
  const devPath = resolve('./public/locales');

  // Try production path first (check if it exists)
  try {
    statSync(prodPath);
    return prodPath;
  } catch {
    // Fall back to dev path
    return devPath;
  }
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return isbot(request.headers.get('user-agent') || '')
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}

async function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  // Create i18next instance for this request
  const instance = createInstance();
  const lng = await i18next.getLocale(request);
  const ns = i18next.getRouteNamespaces(remixContext);

  // Initialize instance with translations
  await instance
    .use(initReactI18next)
    .use(Backend)
    .init({
      ...i18nextConfig,
      lng,
      ns,
      backend: {
        loadPath: resolve(getLocalesPath(), '{{lng}}', '{{ns}}.json'),
      },
    });

  return new Promise((resolve, reject) => {
    const cache = createEmotionCache();
    const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);

    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <CacheProvider value={cache}>
          <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
        </CacheProvider>
      </I18nextProvider>,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');

          // We need to collect the HTML and then inject the critical CSS
          const bodyChunks: Buffer[] = [];
          body.on('data', (chunk) => bodyChunks.push(Buffer.from(chunk)));
          body.on('end', () => {
            const html = Buffer.concat(bodyChunks).toString();

            // Extract and inject critical CSS
            const chunks = extractCriticalToChunks(html);
            const criticalCss = constructStyleTagsFromChunks(chunks);

            // Insert the critical CSS right before the closing head tag
            const modifiedHtml = html.replace('</head>', `${criticalCss}</head>`);

            resolve(
              new Response(modifiedHtml, {
                headers: responseHeaders,
                status: responseStatusCode,
              }),
            );
          });

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            logger.error('Shell error during bot request streaming:', error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

async function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  // Create i18next instance for this request
  const instance = createInstance();
  const lng = await i18next.getLocale(request);
  const ns = i18next.getRouteNamespaces(remixContext);

  // Initialize instance with translations
  await instance
    .use(initReactI18next)
    .use(Backend)
    .init({
      ...i18nextConfig,
      lng,
      ns,
      backend: {
        loadPath: resolve(getLocalesPath(), '{{lng}}', '{{ns}}.json'),
      },
    });

  return new Promise((resolve, reject) => {
    const cache = createEmotionCache();
    const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);

    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <CacheProvider value={cache}>
          <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
        </CacheProvider>
      </I18nextProvider>,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');

          // We need to collect the HTML and then inject the critical CSS
          const bodyChunks: Buffer[] = [];
          body.on('data', (chunk) => bodyChunks.push(Buffer.from(chunk)));
          body.on('end', () => {
            const html = Buffer.concat(bodyChunks).toString();

            // Extract and inject critical CSS
            const chunks = extractCriticalToChunks(html);
            const criticalCss = constructStyleTagsFromChunks(chunks);

            // Insert the critical CSS right before the closing head tag
            const modifiedHtml = html.replace('</head>', `${criticalCss}</head>`);

            resolve(
              new Response(modifiedHtml, {
                headers: responseHeaders,
                status: responseStatusCode,
              }),
            );
          });

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            logger.error('Shell error during browser request streaming:', error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
