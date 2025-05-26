import { Entity, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

import { AccountEntity } from './account.entity';

@Entity({ collection: 'dailyaccountstats' })
export class DailyAccountStatsEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @ManyToOne(() => AccountEntity, {
    fieldName: 'account',
    primary: false,
  })
  account!: Rel<AccountEntity>;

  @Property()
  day!: Date;

  @Property()
  followersCount!: number;

  @Property()
  followingCount!: number;

  @Property()
  statusesCount!: number;

  // No createdAt/updatedAt as per Mongoose schema (timestamps: false)
}
