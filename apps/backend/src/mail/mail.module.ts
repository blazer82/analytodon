import * as path from 'path';

import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { forwardRef, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AccountsModule } from '../accounts/accounts.module';
import { BoostsModule } from '../boosts/boosts.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { FollowersModule } from '../followers/followers.module';
import { HashtagsModule } from '../hashtags/hashtags.module';
import { RepliesModule } from '../replies/replies.module';
import { TootsModule } from '../toots/toots.module';
import { UsersModule } from '../users/users.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('MailModule');

        const host = configService.get<string>('EMAIL_HOST');

        // When no SMTP host is configured (e.g. local/self-hosted setups without a
        // mail server), fall back to nodemailer's JSON transport. Emails are then
        // logged instead of sent, and sendMail() resolves successfully rather than
        // throwing, so flows like registration keep working without a mail server.
        let transportConfig: Record<string, unknown>;
        if (host) {
          const user = configService.get<string>('EMAIL_USER');
          const pass = configService.get<string>('EMAIL_PASS');
          transportConfig = {
            host,
            port: configService.get<number>('EMAIL_PORT', 587),
            secure: configService.get<string>('EMAIL_SECURE', 'true') === 'true', // SMTP over SSL/TLS
            // Only send credentials when both are provided; some relays accept anonymous senders.
            ...(user && pass ? { auth: { user, pass } } : {}),
            tls: {
              rejectUnauthorized: false, // Allow self-signed certificates
            },
          };
        } else {
          logger.warn('EMAIL_HOST is not set. Emails will be logged instead of sent.');
          transportConfig = { jsonTransport: true };
        }

        const fromName = configService.get<string>('EMAIL_FROM_NAME', 'Analytodon');
        const fromAddress = configService.get<string>('EMAIL_FROM_ADDRESS', 'noreply@analytodon.local');

        return {
          transport: transportConfig,
          defaults: {
            from: `"${fromName}" <${fromAddress}>`,
          },
          template: {
            dir: path.join(__dirname, 'templates'), // Path to email templates
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true, // Disallow accessing undefined properties in templates
            },
          },
          // preview: isDevelopment, // Uncomment to preview emails in browser during development
        };
      },
      inject: [ConfigService],
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => AccountsModule),
    BoostsModule,
    FavoritesModule,
    FollowersModule,
    HashtagsModule,
    RepliesModule,
    TootsModule,
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService], // Export MailService for use in other modules
})
export class MailModule {}
