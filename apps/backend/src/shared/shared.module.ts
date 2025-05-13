import { Module } from '@nestjs/common';

@Module({
  providers: [
    // Add shared providers here (e.g., utility services, custom pipes, guards)
  ],
  exports: [
    // Export shared providers to make them available in other modules
  ],
})
export class SharedModule {}
