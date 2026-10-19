import { createServer, IncomingHttpHeaders, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { expect } from 'chai';

import { createMastodonClient, MASTODON_USER_AGENT } from '../../src/helpers/createMastodonClient';

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

  it('sends the Analytodon user agent on REST requests', async () => {
    await createMastodonClient(serverURL, 'token').verifyAccountCredentials();

    expect(receivedHeaders).to.have.length(1);
    expect(receivedHeaders[0]['user-agent']).to.equal(MASTODON_USER_AGENT);
    expect(receivedHeaders[0].authorization).to.equal('Bearer token');
  });

  it('sends the Analytodon user agent without an access token', async () => {
    await createMastodonClient(serverURL).verifyAccountCredentials();

    expect(receivedHeaders[0]['user-agent']).to.equal(MASTODON_USER_AGENT);
  });

  it('applies the request timeout only when given', async () => {
    const slowServer = createServer((_req, res) => {
      setTimeout(() => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ id: '1', username: 'test', acct: 'test' }));
      }, 300);
    });
    await new Promise<void>((resolve) => slowServer.listen(0, '127.0.0.1', resolve));
    const slowURL = `http://127.0.0.1:${(slowServer.address() as AddressInfo).port}`;

    try {
      let timeoutError: any;
      try {
        await createMastodonClient(slowURL, 'token', { timeoutMs: 50 }).verifyAccountCredentials();
      } catch (error) {
        timeoutError = error;
      }

      expect(timeoutError?.code).to.equal('ECONNABORTED');

      const response = await createMastodonClient(slowURL, 'token').verifyAccountCredentials();
      expect(response.data.id).to.equal('1');
    } finally {
      slowServer.closeAllConnections();
      await new Promise<void>((resolve) => slowServer.close(() => resolve()));
    }
  });

  it('does not share headers between clients', async () => {
    await createMastodonClient(serverURL, 'first').verifyAccountCredentials();
    await createMastodonClient(serverURL, 'second').verifyAccountCredentials();

    expect(receivedHeaders.map((h) => h.authorization)).to.deep.equal(['Bearer first', 'Bearer second']);
  });
});
