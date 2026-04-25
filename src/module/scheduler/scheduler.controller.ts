import { Controller, Delete, Get, Param } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

/**
 * Scheduler admin endpoints — view and manage BullMQ repeatable jobs.
 * Only available on the scheduler pod; API pods do not load SchedulerModule.
 */
@Controller('scheduler')
@ApiTags('Scheduler')
@ApiBearerAuth('access-token')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List all active repeatable jobs in Redis' })
  getRepeatableJobs() {
    return this.schedulerService.getRepeatableJobs();
  }

  @Delete('jobs/:name')
  @ApiOperation({ summary: 'Remove a repeatable job by name' })
  removeRepeatableJob(@Param('name') name: string) {
    return this.schedulerService.removeRepeatableJob(name);
  }
}
