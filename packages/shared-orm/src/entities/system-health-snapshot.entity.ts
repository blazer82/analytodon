import { Entity, Property } from '@mikro-orm/core';

import { BaseEntity } from './base.entity';

@Entity({ collection: 'systemhealth' })
export class SystemHealthSnapshotEntity extends BaseEntity {
  @Property()
  generatedAt!: Date;

  @Property()
  data!: Record<string, unknown>;
}
