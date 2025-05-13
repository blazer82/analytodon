import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TootsService {
  constructor(private readonly em: EntityManager) {}

  // Define service methods for toots and toot stats here
}
