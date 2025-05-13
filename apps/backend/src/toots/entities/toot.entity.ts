import { Entity, PrimaryKey, Property, ManyToOne, Rel, Embedded, Collection } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { TagEmbeddable } from './tag.embeddable';

@Entity({ collection: 'toots' })
export class TootEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  uri!: string;

  @ManyToOne(() => AccountEntity, { fieldName: 'account', mapToPk: true, primary: false })
  account!: ObjectId; // Stores the ObjectId of the account

  @Property()
  content!: string;

  @Property()
  favouritesCount!: number;

  @Property()
  fetchedAt!: Date;

  @Property()
  language!: string;

  @Property()
  reblogsCount!: number;

  @Property()
  repliesCount!: number;

  @Property({ type: 'array', nullable: true }) // For MongoDB, array of embeddables
  tags?: TagEmbeddable[];

  @Property()
  url!: string;

  @Property()
  visibility!: string;

  @Property() // Explicitly defined in Mongoose schema
  createdAt!: Date;

  // No updatedAt as per Mongoose schema (timestamps: false and no explicit updatedAt)
}
