import { Entity, PrimaryKey, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { AccountEntity } from '../../accounts/entities/account.entity';

@Entity({ collection: 'dailytootstats' })
export class DailyTootStatsEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @ManyToOne(() => AccountEntity, { fieldName: 'account', mapToPk: true, primary: false })
  account!: ObjectId; // Stores the ObjectId of the account

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
