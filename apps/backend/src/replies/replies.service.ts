import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RepliesService {
  constructor(private readonly em: EntityManager) {}

  // Define service methods for replies statistics here
}
