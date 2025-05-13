import { Controller } from '@nestjs/common';

import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // Define controller methods for account routes here
  // e.g., POST /accounts/connect, GET /accounts/:id
}
