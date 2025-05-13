import { Entity, Property, ManyToOne, Rel, OneToOne } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../../shared/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { AccountCredentialsEntity } from './account-credentials.entity';

@Entity({ collection: 'accounts' })
export class AccountEntity extends BaseEntity {
  @Property()
  serverURL!: string;

  @Property({ nullable: true })
  name?: string;

  @Property({ nullable: true })
  username?: string;

  @Property({ nullable: true })
  accountName?: string;

  @Property({ nullable: true })
  accountURL?: string;

  @Property({ nullable: true })
  avatarURL?: string;

  @Property()
  isActive!: boolean;

  @Property()
  setupComplete!: boolean;

  @ManyToOne(() => UserEntity, { fieldName: 'owner', mapToPk: true, primary: false })
  owner!: ObjectId; // Stores the ObjectId of the user

  @Property()
  utcOffset!: string; // TODO: remove as this property is not reliable (as per Mongoose comment)

  @Property()
  timezone!: string;

  // Mongoose stores ObjectId for credentials.
  @OneToOne(() => AccountCredentialsEntity, creds => creds.account, { owner: false, nullable: true })
  credentials?: Rel<AccountCredentialsEntity>;

  @Property({ type: 'array', nullable: true })
  requestedScope?: string[];
}
