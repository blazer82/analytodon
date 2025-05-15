import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Returns a simple greeting message.
   * @returns A 'Hello World!' string.
   */
  getHello(): string {
    return 'Hello World!';
  }
}
