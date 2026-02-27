// dto/create-product-attribute.dto.ts
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductAttributeDto {
  @ApiProperty({
    description: 'Attribute name (e.g., Color, Storage, Size)',
    example: 'Color',
  })
  @IsNotEmpty()
  @IsString()
  name: string; // e.g. "Color", "Storage"

  @ApiProperty({
    description: 'Category UUID this attribute belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  categoryId: string;
}
