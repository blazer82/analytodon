import { UserEntity } from '@analytodon/shared-orm';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { GetUser } from './decorators/get-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionAccountDto } from './dto/session-account.dto';
import { SessionUserDto } from './dto/session-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered and logged in.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already exists.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'New registrations are currently disabled.' })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<AuthResponseDto> {
    const isRegistrationDisabled = this.configService.get<string>('DISABLE_NEW_REGISTRATIONS') === 'true';
    if (isRegistrationDisabled) {
      throw new ForbiddenException('New registrations are currently disabled.');
    }

    this.logger.log(`Registering user with email: ${registerUserDto.email}`);
    const result = await this.authService.registerUser(registerUserDto);
    await result.user.accounts.init(); // Ensure accounts are loaded for SessionUserDto
    const sessionUser = new SessionUserDto(result.user);
    sessionUser.accounts = result.user.accounts
      .getItems()
      .filter((acc) => acc.setupComplete)
      .map((acc) => new SessionAccountDto(acc));
    return {
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: sessionUser,
    };
  }

  @UseGuards(LocalAuthGuard) // Use LocalAuthGuard for the login route
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginDto }) // Keep ApiBody to describe the expected request payload
  @ApiHeader({
    name: 'accept-language',
    required: false,
    description: 'Browser language preference (e.g., en, de)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged in.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials.',
  })
  async login(
    @GetUser() user: UserEntity,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`User login attempt for user ID: ${user.id}`);
    const locale = this.authService.extractLocaleFromHeader(acceptLanguage);
    const result = await this.authService.login(user, locale);
    await result.user.accounts.init(); // Ensure accounts are loaded for SessionUserDto
    const sessionUser = new SessionUserDto(result.user);
    sessionUser.accounts = result.user.accounts
      .getItems()
      .filter((acc) => acc.setupComplete)
      .map((acc) => new SessionAccountDto(acc));
    return {
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: sessionUser,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully.',
    type: SessionUserDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async getProfile(@GetUser() user: UserEntity): Promise<SessionUserDto> {
    this.logger.log(`Fetching profile for user ID: ${user.id}`);
    // request.user is populated by JwtStrategy.validate()
    // We need to ensure accounts are loaded, similar to login/register flows
    await user.accounts.init();
    const sessionUser = new SessionUserDto(user);
    sessionUser.accounts = user.accounts
      .getItems()
      .filter((acc) => acc.setupComplete)
      .map((acc) => new SessionAccountDto(acc));
    return sessionUser;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiHeader({
    name: 'accept-language',
    required: false,
    description: 'Browser language preference (e.g., en, de)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens refreshed successfully.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token.',
  })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Refreshing token`);
    const locale = this.authService.extractLocaleFromHeader(acceptLanguage);
    const result = await this.authService.refreshTokens(refreshTokenDto.refreshToken, locale);
    await result.user.accounts.init(); // Ensure accounts are loaded for SessionUserDto
    const sessionUser = new SessionUserDto(result.user);
    sessionUser.accounts = result.user.accounts
      .getItems()
      .filter((acc) => acc.setupComplete)
      .map((acc) => new SessionAccountDto(acc));
    return {
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: sessionUser,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out a user' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully logged out.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async logout(@GetUser() user: UserEntity): Promise<void> {
    this.logger.log(`User logout for user ID: ${user.id}`);
    return this.authService.logout(user.id);
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'If user exists and is active, password reset email will be sent.',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
    this.logger.log(`Requesting password reset for email: ${requestPasswordResetDto.email}`);
    return this.authService.requestPasswordReset(requestPasswordResetDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using a token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Password successfully reset.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invalid or expired token.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<void> {
    this.logger.log(`Resetting password with token`);
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify email address using a verification code' })
  @ApiQuery({ name: 'code', required: true, description: 'Email verification code' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Email successfully verified.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invalid or expired verification code.' })
  async verifyEmail(@Query('code') code: string): Promise<void> {
    this.logger.log(`Verifying email with code`);
    return this.authService.verifyEmail(code);
  }
}
