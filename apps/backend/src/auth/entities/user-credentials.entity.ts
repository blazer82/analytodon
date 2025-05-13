import { Entity, Property, OneToOne, Rel } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../../shared/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ collection: 'usercredentials' })
export class UserCredentialsEntity extends BaseEntity {
  @OneToOne(() => UserEntity, { fieldName: 'user', mapToPk: true, nullable: false /*, deleteRule: 'cascade' if needed */ })
  user!: ObjectId; // Stores the ObjectId of the user

  @Property()
  passwordHash!: string;

  @Property({ nullable: true })
  refreshToken?: string;
}
