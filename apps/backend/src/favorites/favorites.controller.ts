import { Controller } from '@nestjs/common';

import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // Define controller methods for favorites routes here
}
