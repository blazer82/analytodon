import { Entity, Enum, Index, Property } from '@mikro-orm/core';

import { BaseEntity } from './base.entity';

export enum CliJobStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

@Entity({ collection: 'cli_job_runs' })
export class CliJobRunEntity extends BaseEntity {
  @Property()
  @Index()
  jobName!: string;

  @Property()
  startedAt!: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @Enum({ items: () => CliJobStatus })
  @Index()
  status!: CliJobStatus;

  @Property({ nullable: true })
  durationMs?: number;

  @Property({ nullable: true })
  recordsProcessed?: number;

  @Property({ nullable: true })
  errorMessage?: string;
}
