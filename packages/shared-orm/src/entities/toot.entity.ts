import { Entity, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

import { AccountEntity } from './account.entity';
import { TagEmbeddable } from './tag.embeddable';

@Entity({ collection: 'toots' })
export class TootEntity {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  uri!: string;

  @ManyToOne(() => AccountEntity, {
    fieldName: 'account',
    primary: false,
  })
  account!: Rel<AccountEntity>;

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
