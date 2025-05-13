import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
// Mail module might not need MikroOrmModule if it doesn't interact with DB directly for its core function

@Module({
  imports: [],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService], // Export if other modules need to send emails
})
export class MailModule {}
