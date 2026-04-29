import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController(new AppService());
  });

  describe('getHealth', () => {
    it('should return API health information', () => {
      const health = appController.getHealth();

      expect(health).toMatchObject({
        name: 'Reabilita Serra API',
        status: 'ok',
      });
      expect(typeof health.timestamp).toBe('string');
    });
  });
});
