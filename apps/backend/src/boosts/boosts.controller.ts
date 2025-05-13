import { Controller } from '@nestjs/common';
import { BoostsService } from './boosts.service';

@Controller('boosts')
export class BoostsController {
  constructor(private readonly boostsService: BoostsService) {}

  // Define controller methods for boosts routes here
}
