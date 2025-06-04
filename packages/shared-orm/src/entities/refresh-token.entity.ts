import { Entity, Index, ManyToOne, Property, Rel } from '@mikro-orm/core';

import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';

@Entity({ collection: 'refreshtokens' })
export class RefreshTokenEntity extends BaseEntity {
  @Property()
  @Index()
  token!: string;

  @ManyToOne(() => UserEntity, { fieldName: 'user', deleteRule: 'cascade' })
  user!: Rel<UserEntity>;

  @Property()
  expiresAt!: Date;
}
