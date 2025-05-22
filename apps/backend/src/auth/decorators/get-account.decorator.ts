import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AccountEntity } from '../../accounts/entities/account.entity';

export const GetAccount = createParamDecorator((data: unknown, ctx: ExecutionContext): AccountEntity => {
  const request = ctx.switchToHttp().getRequest();
  return request.account;
});
