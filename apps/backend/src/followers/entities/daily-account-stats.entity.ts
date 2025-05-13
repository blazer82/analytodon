import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { AccountEntity } from '../../accounts/entities/account.entity';

@Entity({ collection: 'dailyaccountstats' })
export class DailyAccountStatsEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @ManyToOne(() => AccountEntity, { fieldName: 'account', mapToPk: true, primary: false })
  account!: ObjectId; // Stores the ObjectId of the account

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
