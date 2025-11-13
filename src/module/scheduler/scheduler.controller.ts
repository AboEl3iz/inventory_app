import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';
import { NotificationService } from './notification.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService,
    private readonly notificationService :NotificationService
  ) {}

  
}
