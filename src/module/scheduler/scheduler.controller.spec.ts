import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { NotificationService } from './notification.service';

describe('SchedulerController', () => {
  let controller: SchedulerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        {
          provide: SchedulerService,
          useValue: {
            addCustomJob: jest.fn(),
            removeJob: jest.fn(),
            getJobs: jest.fn(),
            pauseJob: jest.fn(),
            resumeJob: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendLowStockAlert: jest.fn(),
            handleLowStockAlert: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SchedulerController>(SchedulerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
