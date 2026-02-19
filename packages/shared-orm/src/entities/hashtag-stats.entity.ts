import { Entity, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

import { AccountEntity } from './account.entity';

@Entity({ collection: 'hashtagstats' })
export class HashtagStatsEntity {
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
  hashtag!: string;

  @Property()
  tootCount!: number;

  @Property()
  repliesCount!: number;

  @Property()
  reblogsCount!: number;

  @Property()
  favouritesCount!: number;

  // No createdAt/updatedAt as per DailyTootStatsEntity pattern (timestamps: false)
}
