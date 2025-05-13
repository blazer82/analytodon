import { Controller } from '@nestjs/common';

import { FollowersService } from './followers.service';

@Controller('followers')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  // Define controller methods for followers routes here
  // e.g., GET /followers/chart, GET /followers/csv
}
