import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';

@Injectable()
export class RepliesService {
  constructor(private readonly em: EntityManager) {}

  // Define service methods for replies statistics here
}
