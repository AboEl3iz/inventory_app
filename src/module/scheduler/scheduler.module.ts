import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { BullModule } from '@nestjs/bullmq';
import { WinstonModule } from 'nest-winston';
import { SCHEDULER_QUEUE } from '../../shared/event.constants';

/**
 * SchedulerModule — "producer" role only.
 *
 * On startup the SchedulerService upserts all repeatable jobs into Redis.
 * It never executes business logic itself — that belongs to the Worker pods
 * via JobsModule processors.
 *
 * This module is loaded ONLY when START_MODE=scheduler.
 */
@Module({
  controllers: [SchedulerController],
  providers: [SchedulerService],
  imports: [WinstonModule, BullModule.registerQueue({ name: SCHEDULER_QUEUE })],
  exports: [SchedulerService],
})
export class SchedulerModule {}
