import { Entity, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

import { AccountEntity } from './account.entity';

@Entity({ collection: 'dailytootstats' })
export class DailyTootStatsEntity {
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
  repliesCount!: number;

  @Property()
  boostsCount!: number;

  @Property()
  favouritesCount!: number;

  // No createdAt/updatedAt as per Mongoose schema (timestamps: false)
}
