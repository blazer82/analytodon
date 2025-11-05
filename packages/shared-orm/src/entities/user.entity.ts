import { Cascade, Collection, Entity, Enum, Index, OneToMany, OneToOne, Property, Rel } from '@mikro-orm/core';

import { AccountEntity } from './account.entity';
import { BaseEntity } from './base.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { UserCredentialsEntity } from './user-credentials.entity';

export enum UserRole {
  Admin = 'admin',
  AccountOwner = 'account-owner',
}

@Entity({ collection: 'users' })
export class UserEntity extends BaseEntity {
  @Property({ unique: true })
  email!: string;

  @Property()
  emailVerified!: boolean;

  @Property({ nullable: true })
  emailVerificationCode?: string;

  @Property({ nullable: true })
  resetPasswordToken?: string;

  @Enum(() => UserRole)
  @Index()
  role!: UserRole;

  @Property()
  isActive!: boolean;

  // Mongoose stores an array of ObjectIds.
  // In MikroORM, for MongoDB, we can represent this as an array of ObjectId strings or use a ManyToMany relationship
  // if we want full relationship management. Given Mongoose schema, array of ObjectIds is direct.
  @OneToMany(() => AccountEntity, (account) => account.owner)
  accounts = new Collection<AccountEntity>(this);

  @Property({ nullable: true })
  maxAccounts?: number;

  @Property({ nullable: true })
  serverURLOnSignUp?: string;

  @Property({ nullable: true })
  timezone?: string;

  @Property({ nullable: true })
  locale?: string;

  // Mongoose stores ObjectId for credentials.
  @OneToOne(() => UserCredentialsEntity, (creds) => creds.user, {
    owner: false,
    nullable: true,
  })
  credentials?: Rel<UserCredentialsEntity>;

  @Property({ type: 'array', nullable: true })
  unsubscribed?: string[];

  @Property({ nullable: true })
  oldAccountDeletionNoticeSent?: boolean;

  @Property({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user, { cascade: [Cascade.ALL] })
  refreshTokens = new Collection<RefreshTokenEntity>(this);
}
