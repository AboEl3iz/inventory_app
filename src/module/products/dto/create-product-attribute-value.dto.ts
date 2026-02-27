import { IsUUID, IsString } from 'class-validator';

export class CreateProductAttributeValueDto {
  @IsString()
  value: string;

  @IsUUID()
  attributeId: string;
}
