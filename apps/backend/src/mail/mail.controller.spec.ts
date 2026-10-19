import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { StaleAccountMailDto } from './dto/stale-account-mail.dto';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

describe('MailController', () => {
  let controller: MailController;
  let mailService: jest.Mocked<Pick<MailService, 'processAndSendStaleAccountNoticeMail'>>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    mailService = {
      processAndSendStaleAccountNoticeMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [{ provide: MailService, useValue: mailService }],
    })
      .overrideGuard(ApiKeyAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MailController>(MailController);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should protect all mail endpoints with the API key guard', () => {
    const guards = Reflect.getMetadata('__guards__', MailController);
    expect(guards).toContain(ApiKeyAuthGuard);
  });

  describe('sendStaleAccountNoticeMail', () => {
    const dto: StaleAccountMailDto = {
      userID: '60d0fe4f5311236168a109ca',
      accountIDs: ['60d0fe4f5311236168a109cb', '60d0fe4f5311236168a109cc'],
    };

    it('should pass the request to the mail service', async () => {
      await controller.sendStaleAccountNoticeMail(dto);

      expect(mailService.processAndSendStaleAccountNoticeMail).toHaveBeenCalledWith(dto);
    });

    it('should not fail the request when processing fails, but log the error', async () => {
      const error = new Error('User not found');
      mailService.processAndSendStaleAccountNoticeMail.mockRejectedValueOnce(error);

      await expect(controller.sendStaleAccountNoticeMail(dto)).resolves.toBeUndefined();
      await new Promise((resolve) => setImmediate(resolve));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error processing stale account notice email for user ${dto.userID}: ${error.message}`,
        error.stack,
      );
    });
  });
});
