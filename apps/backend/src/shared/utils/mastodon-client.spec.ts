import { createServer, IncomingHttpHeaders, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { createMastodonClient, MASTODON_USER_AGENT } from './mastodon-client';

describe('createMastodonClient', () => {
  let server: Server;
  let serverURL: string;
  let receivedHeaders: IncomingHttpHeaders[];

  beforeEach(async () => {
    receivedHeaders = [];
    server = createServer((req, res) => {
      receivedHeaders.push(req.headers);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ id: '1', username: 'test', acct: 'test' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    serverURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('should send the Analytodon user agent on REST requests', async () => {
    await createMastodonClient(serverURL, 'token').verifyAccountCredentials();

    expect(receivedHeaders).toHaveLength(1);
    expect(receivedHeaders[0]['user-agent']).toBe(MASTODON_USER_AGENT);
    expect(receivedHeaders[0].authorization).toBe('Bearer token');
  });

  it('should send the Analytodon user agent when registering an app', async () => {
    await createMastodonClient(serverURL).registerApp('Analytodon', { scopes: ['read'] });

    expect(receivedHeaders.length).toBeGreaterThan(0);
    expect(receivedHeaders[0]['user-agent']).toBe(MASTODON_USER_AGENT);
  });

  it('should send the Analytodon user agent on OAuth requests without an access token', async () => {
    await createMastodonClient(serverURL).fetchAccessToken('client-id', 'client-secret', 'code', 'http://localhost');

    expect(receivedHeaders[0]['user-agent']).toBe(MASTODON_USER_AGENT);
    expect(receivedHeaders[0].authorization).toBeUndefined();
  });
});
