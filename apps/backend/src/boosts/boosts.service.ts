import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BoostsService {
  constructor(private readonly em: EntityManager) {}

  // Define service methods for boosts statistics here
}
