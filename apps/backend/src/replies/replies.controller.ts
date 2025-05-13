import { Controller } from '@nestjs/common';
import { RepliesService } from './replies.service';

@Controller('replies')
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  // Define controller methods for replies routes here
}
