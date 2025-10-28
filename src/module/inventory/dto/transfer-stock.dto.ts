import { IsInt, IsUUID, Min } from "class-validator";

export class TransferStockDto {
  @IsUUID()
  fromBranchId: string;

  @IsUUID()
  toBranchId: string;

  @IsUUID()
  variantId: string;

  @IsInt()
  @Min(1)
  qty: number;
}