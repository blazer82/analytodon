import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../users/entities/user.entity';
import { AccountsService } from './accounts.service';
import { AccountResponseDto } from './dto/account-response.dto';
import { ConnectAccountCallbackQueryDto } from './dto/connect-account-callback.dto';
import { ConnectAccountBodyDto } from './dto/connect-account.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
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
    const account = await this.accountsService.create(createAccountDto, user);
    return new AccountResponseDto(account);
  }

  @Get()
  @ApiOperation({ summary: "Get all of the authenticated user's Mastodon account configurations" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of account configurations retrieved.',
    type: [AccountResponseDto],
  })
  async findAll(@GetUser() user: UserEntity): Promise<AccountResponseDto[]> {
    const accounts = await this.accountsService.findAll(user);
    return accounts.map((account) => new AccountResponseDto(account));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Mastodon account configuration by ID' })
  @ApiParam({ name: 'id', description: 'Account ID (MongoDB ObjectId)', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account configuration retrieved.', type: AccountResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async findOne(@Param('id') id: string, @GetUser() user: UserEntity): Promise<AccountResponseDto> {
    const account = await this.accountsService.findById(id, user);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found or not owned by user.`);
    }
    return new AccountResponseDto(account);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Mastodon account configuration' })
  @ApiParam({ name: 'id', description: 'Account ID', type: String })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account configuration successfully updated.',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @GetUser() user: UserEntity,
  ): Promise<AccountResponseDto> {
    const account = await this.accountsService.update(id, updateAccountDto, user);
    return new AccountResponseDto(account);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Mastodon account configuration' })
  @ApiParam({ name: 'id', description: 'Account ID', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Account configuration successfully deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async remove(@Param('id') id: string, @GetUser() user: UserEntity): Promise<void> {
    await this.accountsService.remove(id, user);
  }

  @Post(':id/connect')
  @ApiOperation({ summary: 'Initiate Mastodon OAuth connection for an account' })
  @ApiParam({ name: 'id', description: 'Account ID to connect', type: String })
  @ApiBody({ type: ConnectAccountBodyDto, required: false }) // Body might be empty
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the Mastodon OAuth authorization URL to redirect the user to.',
    schema: { type: 'object', properties: { redirectUrl: { type: 'string' } } },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found or not owned by user.' })
  async connect(
    @Param('id') accountId: string,
    @GetUser() user: UserEntity,
    // @Body() _connectAccountDto: ConnectAccountBodyDto, // DTO might be empty or have optional redirect post-callback
  ): Promise<{ redirectUrl: string }> {
    return this.accountsService.initiateConnection(accountId, user);
  }

  @Get('connect/callback')
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
      redirectPath = `/settings/accounts/setup-complete?accountId=${accountId}`; // Or just /dashboard/${accountId}
    }

    // For OAuth callbacks, it's common to redirect the user's browser.
    // Set cookies or session info if needed before redirecting.
    // Example: response.cookie('some_flag', 'true');

    return { url: `${frontendBaseUrl}${redirectPath}`, statusCode: HttpStatus.FOUND };
  }
}
