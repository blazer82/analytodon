import { Entity, Property, OneToOne, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../../shared/entities/base.entity';
import { AccountEntity } from './account.entity';

@Entity({ collection: 'accountcredentials' })
export class AccountCredentialsEntity extends BaseEntity {
  @OneToOne(() => AccountEntity, { fieldName: 'account', mapToPk: true, nullable: false /*, deleteRule: 'cascade' if needed */ })
  account!: ObjectId; // Stores the ObjectId of the account

  @Property({ nullable: true })
  clientID?: string;

  @Property({ nullable: true })
  clientSecret?: string;

  @Property({ nullable: true })
  accessToken?: string;

  @Property({ nullable: true })
  connectionToken?: string;
}
