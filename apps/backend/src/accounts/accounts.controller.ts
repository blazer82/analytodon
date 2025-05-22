import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CheckAccount } from '../auth/decorators/check-account.decorator';
import { GetAccount } from '../auth/decorators/get-account.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccountOwnerGuard } from '../auth/guards/account-owner.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../shared/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { AccountsService } from './accounts.service';
import { AccountResponseDto } from './dto/account-response.dto';
import { ConnectAccountCallbackQueryDto } from './dto/connect-account-callback.dto';
import { ConnectAccountResponseDto } from './dto/connect-account-response.dto';
import { ConnectAccountBodyDto } from './dto/connect-account.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountEntity } from './entities/account.entity';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);
  constructor(
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Create a new Mastodon account configuration' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Account configuration successfully created.',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Account already exists or conflict.' })
  async create(@Body() createAccountDto: CreateAccountDto, @GetUser() user: UserEntity): Promise<AccountResponseDto> {
    this.logger.log(`User ${user.id} creating account with server URL: ${createAccountDto.serverURL}`);
    const account = await this.accountsService.create(createAccountDto, user);
    return new AccountResponseDto(account);
  }

  @Get()
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: "Get all of the authenticated user's Mastodon account configurations" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of account configurations retrieved.',
    type: [AccountResponseDto],
  })
  async findAll(@GetUser() user: UserEntity): Promise<AccountResponseDto[]> {
    this.logger.log(`User ${user.id} fetching all accounts`);
    const accounts = await this.accountsService.findAll(user);
    return accounts.map((account) => new AccountResponseDto(account));
  }

  // Note: Parameter name changed from 'id' to 'accountId' to match AccountOwnerGuard expectation
  @Get(':accountId')
  @UseGuards(AccountOwnerGuard) // Apply guard specifically here
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Get a specific Mastodon account configuration by ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID (MongoDB ObjectId)', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account configuration retrieved.', type: AccountResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async findOne(
    @Param('accountId') accountIdParam: string, // Keep for logging if needed
    @GetAccount() account: AccountEntity,
    @GetUser() user: UserEntity,
  ): Promise<AccountResponseDto> {
    this.logger.log(`User ${user.id} fetching account by ID: ${account.id}`);
    // Account is already fetched and validated by AccountOwnerGuard
    return new AccountResponseDto(account);
  }

  @Patch(':accountId')
  @UseGuards(AccountOwnerGuard) // Apply guard
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Update a Mastodon account configuration' })
  @ApiParam({ name: 'accountId', description: 'Account ID', type: String })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account configuration successfully updated.',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async update(
    @Param('accountId') accountIdParam: string,
    @GetAccount() accountEntity: AccountEntity, // Use the account from the guard
    @Body() updateAccountDto: UpdateAccountDto,
    @GetUser() user: UserEntity,
  ): Promise<AccountResponseDto> {
    this.logger.log(`User ${user.id} updating account by ID: ${accountEntity.id}`);
    // Pass accountEntity.id to service, or modify service to accept AccountEntity
    const updatedAccount = await this.accountsService.update(accountEntity.id, updateAccountDto, user);
    return new AccountResponseDto(updatedAccount);
  }

  @Delete(':accountId')
  @UseGuards(AccountOwnerGuard) // Apply guard
  @Roles(UserRole.AccountOwner)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Mastodon account configuration' })
  @ApiParam({ name: 'accountId', description: 'Account ID', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Account configuration successfully deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async remove(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity, // Use the account from the guard
    @GetUser() user: UserEntity,
  ): Promise<void> {
    this.logger.log(`User ${user.id} deleting account by ID: ${account.id}`);
    await this.accountsService.remove(account.id, user);
  }

  @Post(':accountId/connect')
  @UseGuards(AccountOwnerGuard) // Apply guard
  @CheckAccount({ requireSetupComplete: false }) // Allow connection initiation even if setup is not complete
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Initiate Mastodon OAuth connection for an account' })
  @ApiParam({ name: 'accountId', description: 'Account ID to connect', type: String })
  @ApiBody({ type: ConnectAccountBodyDto, required: false }) // Body might be empty
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the Mastodon OAuth authorization URL to redirect the user to.',
    type: ConnectAccountResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async connect(
    @Param('accountId') accountIdParam: string,
    @GetAccount() account: AccountEntity, // Use the account from the guard
    @GetUser() user: UserEntity,
    // @Body() _connectAccountDto: ConnectAccountBodyDto, // DTO might be empty or have optional redirect post-callback
  ): Promise<ConnectAccountResponseDto> {
    this.logger.log(`User ${user.id} initiating connection for account ID: ${account.id}`);
    const { redirectUrl } = await this.accountsService.initiateConnection(account.id, user);
    return new ConnectAccountResponseDto(redirectUrl);
  }

  @Get('connect/callback')
  @Roles(UserRole.AccountOwner)
  @ApiOperation({ summary: 'Handle Mastodon OAuth callback' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects user to frontend settings page upon successful connection.',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid callback parameters.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invalid or expired token.' })
  @Redirect() // NestJS will handle the redirect based on the returned URL object
  async connectCallback(
    @Query() connectAccountCallbackQueryDto: ConnectAccountCallbackQueryDto,
    @GetUser() user: UserEntity, // User from JWT, if any. May not be strictly necessary if token implies user.
  ): Promise<{ url: string; statusCode?: number }> {
    this.logger.log(`Handling connect callback with state: ${connectAccountCallbackQueryDto.state}`);
    // The user from @GetUser might be null if the callback is hit by a browser without an active session cookie
    // The primary link is the `token` in ConnectAccountCallbackQueryDto which maps to `connectionToken`
    // The service method `handleConnectionCallback` should verify ownership via the populated account from connectionToken.
    const { accountId, isReconnect } = await this.accountsService.handleConnectionCallback(
      connectAccountCallbackQueryDto,
      user,
    );

    const frontendBaseUrl = this.configService.get<string>('FRONTEND_URL');
    let redirectPath: string;

    if (isReconnect) {
      redirectPath = `/settings/accounts`; // Or a specific page for successful reconnection
    } else {
      redirectPath = `/accounts/setup-complete?accountId=${accountId}`; // Or just /dashboard/${accountId}
    }

    // For OAuth callbacks, it's common to redirect the user's browser.
    // Set cookies or session info if needed before redirecting.
    // Example: response.cookie('some_flag', 'true');

    return { url: `${frontendBaseUrl}${redirectPath}`, statusCode: HttpStatus.FOUND };
  }
}
