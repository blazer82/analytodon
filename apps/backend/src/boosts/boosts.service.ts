import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';

@Injectable()
export class BoostsService {
  constructor(private readonly em: EntityManager) {}

  // Define service methods for boosts statistics here
}
