import { AccountEntity } from '@analytodon/shared-orm';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetAccount = createParamDecorator((data: unknown, ctx: ExecutionContext): AccountEntity => {
  const request = ctx.switchToHttp().getRequest();
  return request.account;
});
