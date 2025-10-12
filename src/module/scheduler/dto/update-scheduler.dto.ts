import { PartialType } from '@nestjs/mapped-types';
import { CreateSchedulerDto } from './create-scheduler.dto';

export class UpdateSchedulerDto extends PartialType(CreateSchedulerDto) {}
