import { Entity, Property } from '@mikro-orm/core';

import { BaseEntity } from './base.entity';

@Entity({ collection: 'accounthealth' })
export class AccountHealthSnapshotEntity extends BaseEntity {
  @Property()
  generatedAt!: Date;

  @Property()
  data!: Record<string, unknown>;
}
