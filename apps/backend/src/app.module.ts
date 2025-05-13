import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { FollowersModule } from './followers/followers.module';
import { BoostsModule } from './boosts/boosts.module';
import { RepliesModule } from './replies/replies.module';
import { FavoritesModule } from './favorites/favorites.module';
import { MailModule } from './mail/mail.module';
import { TootsModule } from './toots/toots.module';

// Shared Module
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available throughout the app
      // envFilePath: '.env', // Specify your .env file if not in root
    }),
    MikroOrmModule.forRoot({
      // TODO: Configure MikroORM connection options here.
      // This configuration can be loaded from ConfigService.
      // Example:
      // entities: ['./dist/**/*.entity.js'],
      // entitiesTs: ['./src/**/*.entity.ts'],
      // dbName: process.env.DB_NAME,
      // user: process.env.DB_USER,
      // password: process.env.DB_PASSWORD,
      // host: process.env.DB_HOST,
      // port: parseInt(process.env.DB_PORT, 10),
      // type: 'postgresql', // or your DB type
      // allowGlobalContext: true, // Recommended for NestJS
      // autoLoadEntities: true, // Can be useful
    }),
    AuthModule,
    UsersModule,
    AccountsModule,
    FollowersModule,
    BoostsModule,
    RepliesModule,
    FavoritesModule,
    MailModule,
    TootsModule,
    SharedModule,
  ],
  controllers: [], // AppController has been removed
  providers: [],   // AppService has been removed
})
export class AppModule {}
