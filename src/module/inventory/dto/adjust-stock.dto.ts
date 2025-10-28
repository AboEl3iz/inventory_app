import { IsUUID, IsInt } from "class-validator";

export class AdjustStockDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  variantId: string;

  @IsInt()
  qtyChange: number; // +ve or -ve
}