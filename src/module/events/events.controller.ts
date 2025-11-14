import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('events')
@ApiTags('Events')
@ApiBearerAuth('access-token')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create event', description: 'Create a new system event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events', description: 'Retrieve all system events' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID', description: 'Retrieve a specific event' })
  @ApiParam({ name: 'id', type: 'number', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event', description: 'Update event information' })
  @ApiParam({ name: 'id', type: 'number', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(+id, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event', description: 'Delete an event' })
  @ApiParam({ name: 'id', type: 'number', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(+id);
  }
}
