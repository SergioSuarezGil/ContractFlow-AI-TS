import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ServiceContractResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  householdId!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({
    enum: ["electricity", "gas", "insurance", "mobile", "internet", "other"],
  })
  serviceType!: string;

  @ApiProperty()
  providerName!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  notes!: string;

  @ApiProperty({ enum: ["draft", "active", "archived"] })
  status!: string;

  @ApiProperty({ type: [String] })
  currentDocumentIds!: string[];

  @ApiProperty({ type: [String] })
  proposalDocumentIds!: string[];

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;

  @ApiProperty()
  version!: number;
}

export class ContractDocumentResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  contractId!: string;

  @ApiProperty({ enum: ["current", "proposal"] })
  role!: "current" | "proposal";

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class ComparisonAcceptedDto {
  @ApiProperty({ format: "uuid" })
  jobId!: string;

  @ApiProperty()
  status!: string;
}

export class JobResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] })
  status!: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

  @ApiProperty({ format: "uuid" })
  contractId!: string;

  @ApiPropertyOptional({ format: "uuid" })
  comparisonId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  reportId?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class ReportResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  jobId!: string;

  @ApiProperty({ format: "uuid" })
  contractId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}
