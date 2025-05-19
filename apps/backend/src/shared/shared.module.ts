import { Module } from '@nestjs/common';

import { EncryptionService } from './services/encryption.service';

@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class SharedModule {}
