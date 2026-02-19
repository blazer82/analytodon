import * as path from 'path';

import { MongoDriver } from '@mikro-orm/mongodb';
import { MikroOrmModule, MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';

import { AccountsModule } from './accounts/accounts.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BoostsModule } from './boosts/boosts.module';
import { FavoritesModule } from './favorites/favorites.module';
import { FollowersModule } from './followers/followers.module';
import { HashtagsModule } from './hashtags/hashtags.module';
import { MailModule } from './mail/mail.module';
import { RepliesModule } from './replies/replies.module';
import { SharedModule } from './shared/shared.module';
import { TootsModule } from './toots/toots.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        level: process.env.LOG_LEVEL || 'info',
        autoLogging: true,
        redact: ['req.headers.authorization'],
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available throughout the app
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver, new HeaderResolver(['x-lang'])],
    }),
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): MikroOrmModuleOptions => ({
        driver: MongoDriver, // This spits out a warning referring to https://github.com/mikro-orm/nestjs/pull/204 but the fix is not yet released or it does not work
        clientUrl: configService.get<string>('DB_CLIENT_URL'),
        entities: ['./node_modules/@analytodon/shared-orm/dist/**/*.entity.js'],
        entitiesTs: ['./node_modules/@analytodon/shared-orm/src/**/*.entity.ts'],
        ensureDatabase: true,
        ensureIndexes: true,
        allowGlobalContext: true, // Recommended for NestJS
        debug: process.env.NODE_ENV === 'development', // Enable debug logging in dev
      }),
    }),
    AdminModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    FollowersModule,
    BoostsModule,
    RepliesModule,
    FavoritesModule,
    HashtagsModule,
    MailModule,
    TootsModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
