import { SetMetadata } from '@nestjs/common';

export interface CheckAccountOptions {
  requireSetupComplete?: boolean;
}

export const CHECK_ACCOUNT_KEY = 'check_account_options';
export const CheckAccount = (options?: CheckAccountOptions) => SetMetadata(CHECK_ACCOUNT_KEY, options);
