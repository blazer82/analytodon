import { Entity, Index, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

import { AccountEntity } from './account.entity';

export interface FollowerServerCount {
  domain: string;
  count: number;
}

/**
 * Weekly snapshot of the servers an account's followers are on.
 * Only aggregated counts per server domain are stored, never follower identities.
 */
@Entity({ collection: 'followerserversnapshots' })
@Index({ properties: ['account', 'day'] })
export class FollowerServerSnapshotEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @ManyToOne(() => AccountEntity, {
    fieldName: 'account',
    primary: false,
  })
  account!: Rel<AccountEntity>;

  @Property()
  day!: Date;

  // Follower count as reported by the account itself
  @Property()
  totalFollowers!: number;

  // Number of followers actually counted (lower than totalFollowers when the fetch cap was reached)
  @Property()
  sampledFollowers!: number;

  // Domain of the account's own server, used for followers whose acct has no domain part
  @Property({ nullable: true })
  homeServer?: string;

  // Sorted by count, descending
  @Property({ type: 'array' })
  servers: FollowerServerCount[] = [];

  // Set when the server doesn't expose the follower list
  @Property({ nullable: true })
  hidden?: boolean;

  @Property()
  fetchedAt!: Date;
}
