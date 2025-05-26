import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard'; // Adjust path if your guard is elsewhere
import { FirstStatsMailDto } from './dto/first-stats-mail.dto';
import { OldAccountMailDto } from './dto/old-account-mail.dto';
import { WeeklyStatsMailDto } from './dto/weekly-stats-mail.dto';
import { MailService } from './mail.service';

@ApiTags('Mail (Internal)')
@ApiBearerAuth()
@UseGuards(ApiKeyAuthGuard) // Apply guard to all routes in this controller
@Controller('mail')
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(private readonly mailService: MailService) {}

  @Post('first-stats')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger "First Stats Available" email (internal)',
    description:
      'Called by a worker or scheduler when first stats for an account are ready. This endpoint is intended for internal use.',
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Request accepted for processing.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  async sendFirstStatsMail(@Body() firstStatsDto: FirstStatsMailDto): Promise<void> {
    this.logger.log(
      `Received request to send first stats email for user: ${firstStatsDto.userID}, accounts: ${firstStatsDto.accounts.join(', ')}`,
    );
    // Intentionally not awaiting to make it fire-and-forget from the client's perspective
    this.mailService.processAndSendFirstStatsAvailableMail(firstStatsDto).catch((error) => {
      this.logger.error(
        `Error processing first stats email for user ${firstStatsDto.userID}: ${error.message}`,
        error.stack,
      );
    });
  }

  @Post('weekly-stats')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger "Weekly Stats" email (internal)',
    description: 'Called by a worker or scheduler to send weekly stats. This endpoint is intended for internal use.',
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Request accepted for processing.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  async sendWeeklyStatsMail(@Body() weeklyStatsDto: WeeklyStatsMailDto): Promise<void> {
    this.logger.log(
      `Received request to send weekly stats email for user: ${weeklyStatsDto.userID}, accounts: ${weeklyStatsDto.accounts.join(', ')}, reroute: ${weeklyStatsDto.email || 'no'}`,
    );
    this.mailService.processAndSendWeeklyStatsMail(weeklyStatsDto).catch((error) => {
      this.logger.error(
        `Error processing weekly stats email for user ${weeklyStatsDto.userID}: ${error.message}`,
        error.stack,
      );
    });
  }

  @Post('old-account')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger "Old Account Warning" email (internal)',
    description: 'Called by a worker or scheduler for inactive accounts. This endpoint is intended for internal use.',
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Request accepted for processing.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  async sendOldAccountWarningMail(@Body() oldAccountDto: OldAccountMailDto): Promise<void> {
    this.logger.log(`Received request to send old account warning email for user: ${oldAccountDto.userID}`);
    this.mailService.processAndSendOldAccountWarningMail(oldAccountDto).catch((error) => {
      this.logger.error(
        `Error processing old account warning email for user ${oldAccountDto.userID}: ${error.message}`,
        error.stack,
      );
    });
  }
}
