/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';

import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';

import { createEmotionCache } from './utils/createEmotionCache';

const ABORT_DELAY = 5_000;

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

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    const cache = createEmotionCache();
    const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);

    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <CacheProvider value={cache}>
        <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
      </CacheProvider>,
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
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    const cache = createEmotionCache();
    const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);

    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <CacheProvider value={cache}>
        <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
      </CacheProvider>,
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
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
