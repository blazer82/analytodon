import { Controller } from '@nestjs/common';

import { MailService } from './mail.service';

@Controller('mail') // This might not be needed if mail is only triggered internally
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // Define controller methods if you need HTTP endpoints for mail operations (e.g., testing)
}
