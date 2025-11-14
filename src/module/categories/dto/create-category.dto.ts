import { IsOptional, IsString, IsUUID } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {

    @ApiProperty({ description: 'Category name', example: 'Electronics' })
    @IsString()
    name: string;



    @ApiProperty({ description: 'Parent category UUID for subcategories', example: '550e8400-e29b-41d4-a716-446655440000', required: false })
    @IsOptional()
    @IsUUID()
    parentId?: string;

    @ApiProperty({ description: 'Category description', example: 'All electronic products', required: false })
    @IsOptional()
    @IsString()
    description?: string;
}
