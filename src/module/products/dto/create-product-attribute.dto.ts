// dto/create-product-attribute.dto.ts
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateProductAttributeDto {
  @IsNotEmpty()
  @IsString()
  name: string; // e.g. "Color", "Storage"

  @IsUUID()
  categoryId: string;
}
