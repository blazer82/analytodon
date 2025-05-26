import { Entity, Property, Unique } from '@mikro-orm/core';

import { BaseEntity } from './base.entity';

@Entity({ collection: 'mastodon_apps' })
export class MastodonAppEntity extends BaseEntity {
  @Property()
  @Unique()
  serverURL!: string; // e.g., "https://mastodon.social"

  @Property()
  clientID!: string;

  @Property()
  clientSecret!: string;

  @Property({ nullable: true })
  appName?: string; // Optional: Store the name used for registration

  @Property({ type: 'array', nullable: true })
  scopes?: string[]; // Optional: Store the scopes used during registration
}
