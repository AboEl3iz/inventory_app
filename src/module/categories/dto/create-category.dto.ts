import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCategoryDto {

    @IsString()
    name: string;



    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsOptional()
    @IsString()
    description?: string;
}
