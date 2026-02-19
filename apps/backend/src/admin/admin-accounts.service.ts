import { AccountEntity, UserEntity } from '@analytodon/shared-orm';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ObjectId } from 'bson';

import { AdminAccountItemDto } from './dto/admin-account-item.dto';
import { AdminAccountListQueryDto } from './dto/admin-account-list-query.dto';
import { AdminAccountsResponseDto } from './dto/admin-accounts-response.dto';

@Injectable()
export class AdminAccountsService {
  private readonly logger = new Logger(AdminAccountsService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
  ) {}

  async getAccounts(query: AdminAccountListQueryDto): Promise<AdminAccountsResponseDto> {
    const { search, isActive, setupComplete, page = 1, limit = 25 } = query;
    const offset = (page - 1) * limit;

    const where: FilterQuery<AccountEntity> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (setupComplete !== undefined) {
      where.setupComplete = setupComplete;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      // Find users matching the search by email
      const matchingUsers = await this.userRepository.find({ email: searchRegex }, { fields: ['_id'] });
      const matchingUserIds = matchingUsers.map((u) => u._id);

      const orConditions: FilterQuery<AccountEntity>[] = [
        { accountName: searchRegex },
        { username: searchRegex },
        { serverURL: searchRegex },
        { name: searchRegex },
      ];

      if (matchingUserIds.length > 0) {
        orConditions.push({ owner: { $in: matchingUserIds } } as FilterQuery<AccountEntity>);
      }

      where.$or = orConditions;
    }

    const [accounts, total] = await this.accountRepository.findAndCount(where, {
      populate: ['owner'],
      orderBy: { createdAt: 'DESC' },
      offset,
      limit,
    });

    const items: AdminAccountItemDto[] = accounts.map((account) => this.toDto(account));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAccountById(accountId: string): Promise<AdminAccountItemDto> {
    if (!ObjectId.isValid(accountId)) {
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    const account = await this.accountRepository.findOne({ _id: new ObjectId(accountId) }, { populate: ['owner'] });
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    return this.toDto(account);
  }

  private toDto(account: AccountEntity): AdminAccountItemDto {
    const owner = account.owner as UserEntity;
    return {
      id: account.id,
      serverURL: account.serverURL,
      accountName: account.accountName,
      username: account.username,
      name: account.name,
      avatarURL: account.avatarURL,
      isActive: account.isActive,
      setupComplete: account.setupComplete,
      createdAt: account.createdAt.toISOString(),
      owner: {
        id: owner.id,
        email: owner.email,
      },
    };
  }
}
