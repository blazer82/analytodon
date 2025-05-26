import { Entity, OneToOne, Property, Rel } from '@mikro-orm/core';

import { AccountEntity } from './account.entity';
import { BaseEntity } from './base.entity';

@Entity({ collection: 'accountcredentials' })
export class AccountCredentialsEntity extends BaseEntity {
  @OneToOne(() => AccountEntity, {
    fieldName: 'account',
    nullable: false /*, deleteRule: 'cascade' if needed */,
  })
  account!: Rel<AccountEntity>;

  @Property({ nullable: true })
  accessToken?: string;

  @Property({ nullable: true })
  connectionToken?: string;

  // Legacy properties for backward compatibility with the old, flawed OAuth implementation
  @Property({ nullable: true, fieldName: 'clientID' })
  legacyClientID?: string;

  @Property({ nullable: true, fieldName: 'clientSecret' })
  legacyClientSecret?: string;
}
