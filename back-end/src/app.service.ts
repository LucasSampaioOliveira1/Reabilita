import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'Reabilita Serra API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
