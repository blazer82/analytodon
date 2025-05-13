import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountsService {
  constructor(private readonly em: EntityManager) {}

  // Define service methods for Mastodon account management here
  // e.g., connectAccount, saveAccount, deleteAccount
}
