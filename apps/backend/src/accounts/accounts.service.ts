import { EntityManager, EntityRepository, Loaded, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'bson';
import generator, { Entity as MegalodonEntities, MegalodonInterface } from 'megalodon';
import { v4 as uuidv4 } from 'uuid';

import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ConnectAccountCallbackQueryDto } from './dto/connect-account-callback.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountCredentialsEntity } from './entities/account-credentials.entity';
import { AccountEntity } from './entities/account.entity';

import * as timezones from '../shared/data/timezones.json';

const SCOPES = ['read:accounts', 'read:statuses', 'read:notifications']; // As per legacy

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(AccountCredentialsEntity)
    private readonly accountCredentialsRepository: EntityRepository<AccountCredentialsEntity>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates a new account shell for a user.
   * @param createAccountDto - DTO containing account creation data.
   * @param owner - The user entity who owns this account.
   * @returns A promise that resolves to the created account entity.
   * @throws ForbiddenException if the user has reached the maximum account limit.
   * @throws BadRequestException if the provided timezone is invalid.
   */
  async create(createAccountDto: CreateAccountDto, owner: UserEntity): Promise<AccountEntity> {
    const { name, serverURL, timezone } = createAccountDto;

    // Normalize serverURL (e.g., ensure https, remove trailing slash)
    const normalizedServerURL = this.normalizeServerURL(serverURL);

    // Check if an account with the same serverURL and owner already exists (optional, depends on desired constraints)
    // const existing = await this.accountRepository.findOne({ serverURL: normalizedServerURL, owner });
    // if (existing) {
    //   throw new ConflictException('An account with this server URL already exists for this user.');
    // }

    // Max accounts check
    if (typeof owner.maxAccounts === 'number') {
      const currentAccountCount = await owner.accounts.loadCount();
      if (currentAccountCount >= owner.maxAccounts) {
        throw new ForbiddenException(`User has reached the maximum allowed number of accounts (${owner.maxAccounts}).`);
      }
    }

    const utcOffset = this.getUtcOffset(timezone);
    if (!utcOffset) {
      throw new BadRequestException(`Invalid timezone provided: ${timezone}. UTC offset not found.`);
    }

    const account = this.accountRepository.create({
      name: name || new URL(normalizedServerURL).hostname, // Default name to hostname if not provided
      serverURL: normalizedServerURL,
      timezone,
      utcOffset,
      owner,
      isActive: true, // Accounts are active by default
      setupComplete: false, // Setup is not complete until Mastodon connection
    });

    // Associate with user
    owner.accounts.add(account);

    await this.em.persistAndFlush([account, owner]);
    this.logger.log(`Account shell created for ${owner.email} on server ${account.serverURL}`);
    return account;
  }

  /**
   * Finds all accounts belonging to a specific owner.
   * @param owner - The user entity who owns the accounts.
   * @returns A promise that resolves to an array of account entities.
   */
  async findAll(owner: UserEntity): Promise<AccountEntity[]> {
    return this.accountRepository.find({ owner }, { orderBy: { createdAt: 'DESC' } });
  }

  /**
   * Finds an account by its ID and owner.
   * @param id - The ID of the account.
   * @param owner - The user entity who owns the account.
   * @returns A promise that resolves to the account entity or null if not found.
   */
  async findById(id: string, owner: UserEntity): Promise<AccountEntity | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return this.accountRepository.findOne({ _id: new ObjectId(id), owner });
  }

  /**
   * Finds an account by its ID and owner, and verifies it exists.
   * @param id - The ID of the account.
   * @param owner - The user entity who owns the account.
   * @param requireSetupComplete - Whether to require the account setup to be complete.
   * @returns A promise that resolves to the account entity.
   * @throws NotFoundException if the account is not found, not owned by the user, or setup is not complete when required.
   */
  async findByIdOrFail(id: string, owner: UserEntity, requireSetupComplete = false): Promise<Loaded<AccountEntity>> {
    const account = await this.findById(id, owner);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found or not owned by user.`);
    }
    if (requireSetupComplete && !account.setupComplete) {
      throw new NotFoundException(`Account with ID ${id} setup is not complete.`);
    }
    return account;
  }

  /**
   * Updates an existing account.
   * @param id - The ID of the account to update.
   * @param updateAccountDto - DTO containing account update data.
   * @param owner - The user entity who owns the account.
   * @returns A promise that resolves to the updated account entity.
   * @throws NotFoundException if the account is not found or not owned by the user.
   * @throws BadRequestException if an invalid timezone is provided.
   */
  async update(id: string, updateAccountDto: UpdateAccountDto, owner: UserEntity): Promise<AccountEntity> {
    const account = await this.findById(id, owner);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found or not owned by user.`);
    }

    const oldTimezone = account.timezone;
    wrap(account).assign(updateAccountDto);

    if (updateAccountDto.timezone && updateAccountDto.timezone !== oldTimezone) {
      const newUtcOffset = this.getUtcOffset(updateAccountDto.timezone);
      if (!newUtcOffset) {
        // Revert timezone change or throw. Throwing is consistent with create.
        // For simplicity, we'll throw. If transactional behavior is needed to revert,
        // it would require more complex handling or UoW.
        throw new BadRequestException(`Invalid timezone provided: ${updateAccountDto.timezone}. UTC offset not found.`);
      }
      account.utcOffset = newUtcOffset;
    }

    await this.em.persistAndFlush(account);
    this.logger.log(`Account ${id} updated by ${owner.email}`);
    return account;
  }

  /**
   * Removes an account.
   * @param id - The ID of the account to remove.
   * @param owner - The user entity who owns the account.
   * @returns A promise that resolves when the account is removed.
   * @throws NotFoundException if the account is not found or not owned by the user.
   */
  async remove(id: string, owner: UserEntity): Promise<void> {
    const account = await this.findById(id, owner);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found or not owned by user.`);
    }

    // Remove associated credentials first
    if (account.credentials) {
      await this.accountCredentialsRepository.nativeDelete({ account });
    }

    // Simply remove the account entity - MikroORM will handle the relationship updates
    await this.em.removeAndFlush(account);

    this.logger.log(`Account ${id} removed by ${owner.email}`);
  }

  /**
   * Initiates the OAuth connection process for a Mastodon account.
   * Registers the application with the Mastodon instance and returns a redirect URL for authorization.
   * @param accountId - The ID of the account to connect.
   * @param owner - The user entity who owns the account.
   * @returns A promise that resolves to an object containing the redirect URL.
   * @throws NotFoundException if the account is not found.
   * @throws InternalServerErrorException if app registration with Mastodon fails.
   */
  async initiateConnection(accountId: string, owner: UserEntity): Promise<{ redirectUrl: string }> {
    const account = await this.findById(accountId, owner);
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found or not owned by user.`);
    }
    if (account.setupComplete) {
      this.logger.warn(`Account ${accountId} is already connected. Reconnecting.`);
      // Potentially clear old credentials or handle re-connection logic
    }

    const connectionToken = uuidv4();
    const appURL = this.configService.get<string>('API_URL');
    const marketingURL = this.configService.get<string>('MARKETING_URL');
    const redirectUri = `${appURL}/api/accounts/connect/callback?token=${connectionToken}`;

    let client: MegalodonInterface;
    try {
      client = generator('mastodon', account.serverURL);
      const appName = this.configService.get<string>('MASTODON_APP_NAME', 'Analytodon');
      const appData = await client.registerApp(appName, {
        scopes: SCOPES,
        redirect_uris: redirectUri,
        website: marketingURL,
      });
      this.logger.log(`App registered on ${account.serverURL} for account ${accountId}`);

      // Construct the authorization URL
      const authorizeUrl = `${account.serverURL}/oauth/authorize?client_id=${appData.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${SCOPES.join(' ')}`;

      let accountCredentials = await this.accountCredentialsRepository.findOne({ account });
      if (!accountCredentials) {
        accountCredentials = this.accountCredentialsRepository.create({
          account,
          clientID: appData.client_id,
          clientSecret: appData.client_secret,
          connectionToken,
        });
        account.credentials = accountCredentials;
      } else {
        wrap(accountCredentials).assign({
          clientID: appData.client_id,
          clientSecret: appData.client_secret,
          connectionToken,
          accessToken: undefined, // Clear old access token if any
        });
      }

      await this.em.persistAndFlush([accountCredentials, account]);
      return { redirectUrl: authorizeUrl };
    } catch (error) {
      this.logger.error(`Failed to register app on ${account.serverURL}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Unable to connect to Mastodon instance ${account.serverURL}. Please ensure the server URL is correct and the instance is reachable.`,
      );
    }
  }

  /**
   * Handles the OAuth callback from the Mastodon instance after user authorization.
   * Fetches access tokens, verifies account credentials, and updates the account entity.
   * @param callbackQueryDto - DTO containing the connection token and authorization code.
   * @param ownerHint - The user entity expected to own this connection (for security verification).
   * @returns A promise that resolves to an object containing the account ID and a boolean indicating if it was a reconnect.
   * @throws NotFoundException if the connection token is invalid.
   * @throws ForbiddenException if the owner hint does not match the token's owner.
   * @throws InternalServerErrorException if finalizing the connection with Mastodon fails.
   */
  async handleConnectionCallback(
    callbackQueryDto: ConnectAccountCallbackQueryDto,
    ownerHint: UserEntity,
  ): Promise<{ accountId: string; isReconnect: boolean }> {
    const { token: connectionToken, code } = callbackQueryDto;

    const accountCredentials = await this.accountCredentialsRepository.findOne(
      { connectionToken },
      { populate: ['account', 'account.owner'] },
    );

    if (!accountCredentials || !accountCredentials.account) {
      this.logger.error(`Invalid or expired connection token received: ${connectionToken}`);
      throw new NotFoundException('Invalid or expired connection token.');
    }

    const account = accountCredentials.account as Loaded<AccountEntity, 'owner'>;
    const owner = account.owner as Loaded<UserEntity>; // Owner should be populated

    // Verify ownerHint for added security layer if needed.
    if (ownerHint && owner.id !== ownerHint.id) {
      this.logger.error(
        `Callback owner mismatch for token ${connectionToken}. Expected ${ownerHint.id}, got ${owner.id}`,
      );
      throw new ForbiddenException('User mismatch during callback.');
    }

    const isReconnect = account.setupComplete;
    const appURL = this.configService.get<string>('API_URL');
    const callbackRedirectUri = `${appURL}/api/accounts/connect/callback?token=${connectionToken}`;
    let oauthClient: MegalodonInterface;
    let mastodonClient: MegalodonInterface;

    try {
      oauthClient = generator('mastodon', account.serverURL);
      const tokenData: MegalodonEntities.Token = await oauthClient.fetchAccessToken(
        accountCredentials.clientID!, // clientID and clientSecret should exist
        accountCredentials.clientSecret!,
        code,
        callbackRedirectUri, // Must match exactly what was used in registerApp
      );

      accountCredentials.accessToken = tokenData.access_token;
      accountCredentials.connectionToken = undefined; // Clear the connection token

      mastodonClient = generator('mastodon', account.serverURL, tokenData.access_token);
      const mastodonAccountInfoResponse = await mastodonClient.verifyAccountCredentials();
      const mastodonAccountInfo: MegalodonEntities.Account = mastodonAccountInfoResponse.data;

      wrap(account).assign({
        name: mastodonAccountInfo.display_name || account.name, // Prefer Mastodon's display_name if available
        username: mastodonAccountInfo.username,
        accountURL: mastodonAccountInfo.url,
        avatarURL: mastodonAccountInfo.avatar,
        accountName: `@${mastodonAccountInfo.username}@${this.stripSchemaFromServerURL(account.serverURL)}`,
        setupComplete: true,
        isActive: true, // Ensure account is active
        requestedScope: SCOPES,
      });

      await this.em.persistAndFlush([account, accountCredentials]);
      this.logger.log(`Account connection complete for ${account.accountName} (User: ${owner.email})`);

      return { accountId: account.id, isReconnect };
    } catch (error) {
      this.logger.error(
        `Error during Mastodon OAuth callback for account ${account.id}: ${error.message}`,
        error.stack,
      );
      // It's crucial to not leave tokens or secrets in a bad state if possible.
      // Consider clearing accessToken on accountCredentials if fetchAccessToken or verifyAccountCredentials fails.
      // accountCredentials.accessToken = undefined;
      // await this.em.persistAndFlush(accountCredentials);
      throw new InternalServerErrorException('Failed to finalize Mastodon connection.');
    }
  }

  /**
   * Gets the UTC offset for a given timezone name.
   * @param timezoneName - The name of the timezone (e.g., "America/New_York").
   * @returns The UTC offset string (e.g., "-04:00") or undefined if not found.
   */
  private getUtcOffset(timezoneName: string): string | undefined {
    const tzData = timezones.find((tz: { name: string; utcOffset: string }) => tz.name === timezoneName);
    return tzData?.utcOffset;
  }

  /**
   * Normalizes a server URL to a standard format (https, no trailing slash, hostname only).
   * @param serverURL - The server URL string to normalize.
   * @returns The normalized server URL.
   * @throws BadRequestException if the server URL format is invalid.
   */
  private normalizeServerURL(serverURL: string): string {
    let normalized = serverURL.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    try {
      const url = new URL(normalized);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        // Allow http for localhost dev
        if (url.hostname !== 'localhost' && !url.hostname.startsWith('127.0.0.1')) {
          throw new Error('Only http or https protocols are allowed.');
        }
      }
      return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
    } catch (_e) {
      throw new BadRequestException('Invalid server URL format.');
    }
  }

  /**
   * Strips the schema (http/https) from a server URL.
   * @param serverURL - The server URL string.
   * @returns The server URL without the schema, including port if present.
   */
  private stripSchemaFromServerURL(serverURL: string): string {
    try {
      const url = new URL(serverURL);
      return `${url.hostname}${url.port ? ':' + url.port : ''}`;
    } catch (_e) {
      // Fallback for already stripped or malformed URLs
      return serverURL.replace(/^https?:\/\//, '');
    }
  }
}
