import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
    @ApiProperty({ description: 'Title of the event' })
    @IsNotEmpty()
    @IsString()
    title: string;

    @ApiProperty({ description: 'Detailed description of the event' })
    @IsNotEmpty()
    @IsString()
    description: string;

    @ApiPropertyOptional({ description: 'Date of the event', example: '2023-10-01T12:00:00Z' })
    @IsOptional()
    @IsDateString()
    eventDate?: Date;

    @ApiProperty({ description: 'Who created or triggered the event' })
    @IsNotEmpty()
    @IsString()
    createdBy: string;
}
