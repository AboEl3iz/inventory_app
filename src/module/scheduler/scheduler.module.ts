import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Module({
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
