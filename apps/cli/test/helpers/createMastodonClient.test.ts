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

  it('does not share headers between clients', async () => {
    await createMastodonClient(serverURL, 'first').verifyAccountCredentials();
    await createMastodonClient(serverURL, 'second').verifyAccountCredentials();

    expect(receivedHeaders.map((h) => h.authorization)).to.deep.equal(['Bearer first', 'Bearer second']);
  });
});
