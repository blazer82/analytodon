import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['authorization']; // Matches legacy check

    const validApiKey = this.configService.get<string>('EMAIL_API_KEY');

    if (!validApiKey) {
      // This is a server configuration issue.
      this.logger.error('CRITICAL: EMAIL_API_KEY is not configured on the server.');
      // Throwing UnauthorizedException here might obscure the real issue from admins,
      // but it's safer than allowing unauthenticated access.
      // Consider more robust error handling or startup checks for critical env vars.
      throw new UnauthorizedException('API key endpoint is not properly configured.');
    }

    if (apiKeyHeader && apiKeyHeader === validApiKey) {
      return true;
    }

    this.logger.warn(`Invalid or missing API key attempt. Header: ${apiKeyHeader}`);
    throw new UnauthorizedException('Invalid or missing API key.');
  }
}
