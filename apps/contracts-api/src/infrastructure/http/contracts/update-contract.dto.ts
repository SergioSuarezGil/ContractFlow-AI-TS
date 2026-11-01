import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateContractDto {
  @ApiPropertyOptional({
    enum: ["electricity", "gas", "insurance", "mobile", "internet", "other"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["electricity", "gas", "insurance", "mobile", "internet", "other"])
  serviceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  providerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ enum: ["draft", "active", "under_review"] })
  @IsOptional()
  @IsString()
  @IsIn(["draft", "active", "under_review"])
  status?: string;
}
