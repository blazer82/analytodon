import { Entity, Property } from '@mikro-orm/core';

import { BaseEntity } from './base.entity';

@Entity({ collection: 'adminstats' })
export class AdminStatsSnapshotEntity extends BaseEntity {
  @Property()
  generatedAt!: Date;

  @Property()
  data!: Record<string, unknown>;
}
