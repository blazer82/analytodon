import { Entity, OneToOne, Property, Rel } from '@mikro-orm/core';

import { BaseEntity } from '../../shared/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ collection: 'usercredentials' })
export class UserCredentialsEntity extends BaseEntity {
  @OneToOne(() => UserEntity, {
    fieldName: 'user',
    nullable: false /*, deleteRule: 'cascade' if needed */,
  })
  user!: Rel<UserEntity>;

  @Property()
  passwordHash!: string;

  @Property({ nullable: true })
  refreshToken?: string;
}
