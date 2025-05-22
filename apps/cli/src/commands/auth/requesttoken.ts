import { Command, Flags } from '@oclif/core';
import generator from 'megalodon';

import { logger } from '../../helpers/logger';

export default class RequestToken extends Command {
  static description = 'Aid with requesting OAuth token manually';

  static examples = [`<%= config.bin %> <%= command.id %>`];

  static flags = {
    serverURL: Flags.string({
      char: 'i',
      description: 'Mastodon instance URL',
      required: true,
    }),
    clientID: Flags.string({
      char: 'c',
      description: 'OAuth client ID',
      required: false,
    }),
    clientSecret: Flags.string({
      char: 's',
      description: 'OAuth client secret',
      required: false,
    }),
    code: Flags.string({
      char: 'o',
      description: 'OAuth code',
      required: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(RequestToken);

    if (flags.clientID && flags.clientSecret && flags.code) {
      logger.info('Authorizing app');
      const client = generator('mastodon', `https://${flags.serverURL}`);
      const response = await client.fetchAccessToken(flags.clientID, flags.clientSecret, flags.code);
      // eslint-disable-next-line no-console
      console.log('response', response);
    } else {
      logger.info(`Register app with ${flags.serverURL}`);

      const client = generator('mastodon', `https://${flags.serverURL}`);
      const response = await client.registerApp('Analytodon', {
        scopes: ['read:accounts', 'read:statuses', 'read:notifications'],
      });
      // eslint-disable-next-line no-console
      console.log('response', response);
    }
  }
}
