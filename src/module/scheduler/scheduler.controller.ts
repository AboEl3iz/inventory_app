import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post()
  create(@Body() createSchedulerDto: CreateSchedulerDto) {
    return this.schedulerService.create(createSchedulerDto);
  }

  @Get()
  findAll() {
    return this.schedulerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSchedulerDto: UpdateSchedulerDto) {
    return this.schedulerService.update(+id, updateSchedulerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulerService.remove(+id);
  }
}
