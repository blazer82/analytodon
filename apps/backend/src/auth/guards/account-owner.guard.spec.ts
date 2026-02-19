import { AccountEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { Loaded } from '@mikro-orm/core';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AccountsService } from '../../accounts/accounts.service';
import { AccountOwnerGuard } from './account-owner.guard';

describe('AccountOwnerGuard', () => {
  let guard: AccountOwnerGuard;
  let reflector: jest.Mocked<Reflector>;
  let accountsService: jest.Mocked<AccountsService>;

  const mockAccount = { id: 'account-id', owner: { id: 'owner-id' } } as unknown as Loaded<AccountEntity, 'owner'>;

  const createMockExecutionContext = (
    params: Record<string, string>,
    user: Partial<UserEntity>,
    method: string,
  ): ExecutionContext => {
    const request = { params, user, method, account: undefined };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    reflector = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<Reflector>;

    accountsService = {
      findByIdOrFail: jest.fn(),
      findByIdAdminOrFail: jest.fn(),
    } as unknown as jest.Mocked<AccountsService>;

    guard = new AccountOwnerGuard(reflector, accountsService);
  });

  it('should allow admin GET request using findByIdAdminOrFail', async () => {
    const adminUser = { id: 'admin-id', role: UserRole.Admin } as UserEntity;
    const context = createMockExecutionContext({ accountId: 'account-id' }, adminUser, 'GET');
    accountsService.findByIdAdminOrFail.mockResolvedValue(mockAccount);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(accountsService.findByIdAdminOrFail).toHaveBeenCalledWith('account-id', false);
    expect(accountsService.findByIdOrFail).not.toHaveBeenCalled();
  });

  it('should deny admin POST request to non-owned account using findByIdOrFail', async () => {
    const adminUser = { id: 'admin-id', role: UserRole.Admin } as UserEntity;
    const context = createMockExecutionContext({ accountId: 'account-id' }, adminUser, 'POST');
    accountsService.findByIdOrFail.mockRejectedValue(new NotFoundException());

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);

    expect(accountsService.findByIdOrFail).toHaveBeenCalledWith('account-id', adminUser, false);
    expect(accountsService.findByIdAdminOrFail).not.toHaveBeenCalled();
  });

  it('should deny admin PATCH request to non-owned account using findByIdOrFail', async () => {
    const adminUser = { id: 'admin-id', role: UserRole.Admin } as UserEntity;
    const context = createMockExecutionContext({ accountId: 'account-id' }, adminUser, 'PATCH');
    accountsService.findByIdOrFail.mockRejectedValue(new NotFoundException());

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    expect(accountsService.findByIdAdminOrFail).not.toHaveBeenCalled();
  });

  it('should deny admin DELETE request to non-owned account using findByIdOrFail', async () => {
    const adminUser = { id: 'admin-id', role: UserRole.Admin } as UserEntity;
    const context = createMockExecutionContext({ accountId: 'account-id' }, adminUser, 'DELETE');
    accountsService.findByIdOrFail.mockRejectedValue(new NotFoundException());

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    expect(accountsService.findByIdAdminOrFail).not.toHaveBeenCalled();
  });

  it('should deny non-admin access to non-owned account', async () => {
    const regularUser = { id: 'user-id', role: UserRole.AccountOwner } as UserEntity;
    const context = createMockExecutionContext({ accountId: 'account-id' }, regularUser, 'GET');
    accountsService.findByIdOrFail.mockRejectedValue(new NotFoundException());

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);

    expect(accountsService.findByIdOrFail).toHaveBeenCalledWith('account-id', regularUser, false);
    expect(accountsService.findByIdAdminOrFail).not.toHaveBeenCalled();
  });

  it('should allow non-admin access to owned account', async () => {
    const regularUser = { id: 'owner-id', role: UserRole.AccountOwner } as UserEntity;
    const context = createMockExecutionContext({ accountId: 'account-id' }, regularUser, 'GET');
    accountsService.findByIdOrFail.mockResolvedValue(mockAccount);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(accountsService.findByIdOrFail).toHaveBeenCalledWith('account-id', regularUser, false);
  });

  it('should attach account to request on success', async () => {
    const adminUser = { id: 'admin-id', role: UserRole.Admin } as UserEntity;
    const context = createMockExecutionContext({ accountId: 'account-id' }, adminUser, 'GET');
    accountsService.findByIdAdminOrFail.mockResolvedValue(mockAccount);

    await guard.canActivate(context);

    const request = context.switchToHttp().getRequest();
    expect(request.account).toBe(mockAccount);
  });
});
