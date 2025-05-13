import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserCredentialsEntity } from './entities/user-credentials.entity';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { authConstants } from '../shared/constants/auth.constants';
// LocalStrategy will be added in a subsequent step

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [UserCredentialsEntity],
    }),
    UsersModule, // To use UsersService
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule], // Ensure ConfigModule is imported if not global
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
        signOptions: {
          expiresIn: configService.get<string>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // Add JwtStrategy here
  exports: [AuthService, JwtModule, PassportModule], // Export for use in other modules if needed
})
export class AuthModule {}
