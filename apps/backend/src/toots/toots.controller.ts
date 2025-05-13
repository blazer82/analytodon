import { Controller } from '@nestjs/common';
import { TootsService } from './toots.service';

@Controller('toots')
export class TootsController {
  constructor(private readonly tootsService: TootsService) {}

  // Define controller methods for toots routes here
}
