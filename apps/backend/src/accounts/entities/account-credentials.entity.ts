import { Entity, OneToOne, Property, Rel } from '@mikro-orm/core';

import { BaseEntity } from '../../shared/entities/base.entity';
import { AccountEntity } from './account.entity';

@Entity({ collection: 'accountcredentials' })
export class AccountCredentialsEntity extends BaseEntity {
  @OneToOne(() => AccountEntity, {
    fieldName: 'account',
    nullable: false /*, deleteRule: 'cascade' if needed */,
  })
  account!: Rel<AccountEntity>;

  @Property({ nullable: true })
  clientID?: string;

  @Property({ nullable: true })
  clientSecret?: string;

  @Property({ nullable: true })
  accessToken?: string;

  @Property({ nullable: true })
  connectionToken?: string;
}
