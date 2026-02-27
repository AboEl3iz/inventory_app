import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticationGuard } from 'src/common/guard/authentication.guard';
import { AuthorizationGuard } from 'src/common/guard/authorization.guard';
import { Role, Roles } from 'src/common/decorator/roles.decorator';

@Controller('events')
@ApiTags('Events')
@ApiBearerAuth('access-token')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  @Roles(Role.admin, Role.manager)
  @Post()
  @ApiOperation({ summary: 'Create event', description: 'Create a new system event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Roles(Role.admin, Role.manager)
  @Get()
  @ApiOperation({ summary: 'Get all events', description: 'Retrieve all system events' })
  @ApiQuery({ name: 'page', type: 'number', required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.findAll(page, limit);
  }

  @Roles(Role.admin, Role.manager)
  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID', description: 'Retrieve a specific event' })
  @ApiParam({ name: 'id', type: 'string', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Roles(Role.admin)
  @Patch(':id')
  @ApiOperation({ summary: 'Update event', description: 'Update event information' })
  @ApiParam({ name: 'id', type: 'string', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Roles(Role.admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete event', description: 'Delete an event' })
  @ApiParam({ name: 'id', type: 'string', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.remove(id);
  }
}
