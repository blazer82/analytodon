import { UserRole } from '@analytodon/shared-orm';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ManageSubscriptionDto } from './dto/subscription-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user (Admin)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User successfully created.', type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already exists.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Admin creating user with email: ${createUserDto.email}`);
    const user = await this.usersService.create(createUserDto);
    return new UserResponseDto(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a list of all users (Admin)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of users retrieved.', type: [UserResponseDto] })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async findAllUsers(): Promise<UserResponseDto[]> {
    this.logger.log(`Admin fetching all users`);
    const users = await this.usersService.findAll();
    return users.map((user) => new UserResponseDto(user));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user details by ID (Admin)' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'User details retrieved.', type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async findUserById(@Param('id') id: string): Promise<UserResponseDto> {
    this.logger.log(`Admin fetching user by ID: ${id}`);
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return new UserResponseDto(user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user details by ID (Admin)' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'User successfully updated.', type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Admin updating user by ID: ${id}`);
    const user = await this.usersService.update(id, updateUserDto);
    return new UserResponseDto(user);
  }

  @Post('send-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send an email to a group of users (Admin)' })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Email sending process initiated.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource.' })
  async sendEmailToUsers(@Body() sendEmailDto: SendEmailDto): Promise<void> {
    this.logger.log(`Admin sending email to group: ${sendEmailDto.recipientGroup}`);
    await this.usersService.sendEmailToUsers(sendEmailDto);
  }

  // --- User Email Subscription Management Endpoints ---
  // These endpoints are typically public or use a different auth mechanism (e.g., token in email link)
  // For simplicity, no JWT guard is applied here.

  @Post('subscribe/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Subscribe user to an email list type' })
  @ApiParam({ name: 'type', description: 'Email list type (e.g., weekly, news)', type: String })
  @ApiBody({ type: ManageSubscriptionDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Subscription successful.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  async subscribe(@Param('type') type: string, @Body() manageSubscriptionDto: ManageSubscriptionDto): Promise<void> {
    this.logger.log(`User ${manageSubscriptionDto.e} subscribing to list type: ${type}`);
    await this.usersService.manageSubscription(manageSubscriptionDto, type, true);
  }

  @Post('unsubscribe/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsubscribe user from an email list type' })
  @ApiParam({ name: 'type', description: 'Email list type (e.g., weekly, news)', type: String })
  @ApiBody({ type: ManageSubscriptionDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Unsubscription successful.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  async unsubscribe(@Param('type') type: string, @Body() manageSubscriptionDto: ManageSubscriptionDto): Promise<void> {
    this.logger.log(`User ${manageSubscriptionDto.e} unsubscribing from list type: ${type}`);
    await this.usersService.manageSubscription(manageSubscriptionDto, type, false);
  }
}
