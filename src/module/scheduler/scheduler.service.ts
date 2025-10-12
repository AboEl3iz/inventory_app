import { Injectable } from '@nestjs/common';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';

@Injectable()
export class SchedulerService {
  create(createSchedulerDto: CreateSchedulerDto) {
    return 'This action adds a new scheduler';
  }

  findAll() {
    return `This action returns all scheduler`;
  }

  findOne(id: number) {
    return `This action returns a #${id} scheduler`;
  }

  update(id: number, updateSchedulerDto: UpdateSchedulerDto) {
    return `This action updates a #${id} scheduler`;
  }

  remove(id: number) {
    return `This action removes a #${id} scheduler`;
  }
}
