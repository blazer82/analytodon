import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AccountsService } from '../../accounts/accounts.service';
import { UserEntity } from '../../users/entities/user.entity';
import { CHECK_ACCOUNT_KEY, CheckAccountOptions } from '../decorators/check-account.decorator';

@Injectable()
export class AccountOwnerGuard implements CanActivate {
  private readonly logger = new Logger(AccountOwnerGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accountsService: AccountsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const accountId = request.params.accountId; // Assumes 'accountId' is the name of the route parameter
    const user = request.user as UserEntity; // Assumes JwtAuthGuard has run and populated user

    if (!accountId) {
      this.logger.error(
        'AccountOwnerGuard: accountId not found in request params. This should not happen if routes are correctly defined.',
      );
      throw new BadRequestException('Account ID is missing from the request path.');
    }

    if (!user) {
      this.logger.error(
        'AccountOwnerGuard: user not found in request. Ensure JwtAuthGuard runs before AccountOwnerGuard and populates request.user.',
      );
      // This indicates a potential issue with guard ordering or JwtAuthGuard not working as expected.
      throw new UnauthorizedException('User not authenticated or user information is missing.');
    }

    const handler = context.getHandler();
    const classOptions = this.reflector.get<CheckAccountOptions>(CHECK_ACCOUNT_KEY, context.getClass());
    const methodOptions = this.reflector.get<CheckAccountOptions>(CHECK_ACCOUNT_KEY, handler);

    // Method options override class options if both are present.
    // If only class options are present, use them.
    // If only method options are present, use them.
    const options = methodOptions || classOptions;
    const requireSetupComplete = options?.requireSetupComplete ?? false;

    try {
      // findByIdOrFail will throw NotFoundException if not found, not owned, or setup incomplete (if required)
      const account = await this.accountsService.findByIdOrFail(accountId, user, requireSetupComplete);
      request.account = account; // Attach the loaded account to the request for easy access in controllers
      return true;
    } catch (error) {
      // Log the error and re-throw it to be handled by NestJS's global exception filter
      if (error instanceof NotFoundException) {
        this.logger.debug(
          `AccountOwnerGuard: Access denied for user ${user.id} to account ${accountId}. Reason: ${error.message}`,
        );
      } else {
        this.logger.error(
          `AccountOwnerGuard: Unexpected error for user ${user.id}, account ${accountId}: ${error.message}`,
          error.stack,
        );
      }
      throw error;
    }
  }
}
