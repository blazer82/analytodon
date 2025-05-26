import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class TagEmbeddable {
  @Property()
  name!: string;

  @Property()
  url!: string;
}
