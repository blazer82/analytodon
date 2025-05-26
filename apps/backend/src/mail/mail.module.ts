import * as path from 'path';

import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AccountsModule } from '../accounts/accounts.module';
import { BoostsModule } from '../boosts/boosts.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { FollowersModule } from '../followers/followers.module';
import { RepliesModule } from '../replies/replies.module';
import { UsersModule } from '../users/users.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const transportConfig = {
          host: configService.getOrThrow<string>('EMAIL_HOST'),
          port: configService.getOrThrow<number>('EMAIL_PORT'),
          secure: configService.get<string>('EMAIL_SECURE', 'true') === 'true', // SMTP over SSL/TLS
          auth: {
            user: configService.getOrThrow<string>('EMAIL_USER'),
            pass: configService.getOrThrow<string>('EMAIL_PASS'),
          },
          tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
          },
        };

        return {
          transport: transportConfig,
          defaults: {
            from: `"${configService.getOrThrow<string>('EMAIL_FROM_NAME')}" <${configService.getOrThrow<string>('EMAIL_FROM_ADDRESS')}>`,
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
    RepliesModule,
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService], // Export MailService for use in other modules
})
export class MailModule {}
