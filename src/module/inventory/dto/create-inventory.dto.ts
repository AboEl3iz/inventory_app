import { IsUUID, IsInt, Min, IsOptional } from "class-validator";

export class CreateInventoryDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  variantId: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsInt()
  @IsOptional()
  minThreshold?: number;
}