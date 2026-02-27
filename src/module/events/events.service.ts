import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) { }

  async create(createEventDto: CreateEventDto) {
    const event = this.eventRepo.create({
      ...createEventDto,
      eventDate: createEventDto.eventDate || new Date(),
    });
    return this.eventRepo.save(event);
  }

  async findAll(page = 1, limit = 20) {
    const [events, total] = await this.eventRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: events,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    Object.assign(event, updateEventDto);
    return this.eventRepo.save(event);
  }

  async remove(id: string) {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    await this.eventRepo.softRemove(event);
    return { message: 'Event removed successfully' };
  }
}
