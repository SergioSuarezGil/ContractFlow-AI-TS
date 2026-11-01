import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";
import type { ActorContext } from "../../../application/dto/actor.dto";
import { AttachDocumentUseCase } from "../../../application/use-cases/attach-document.use-case";
import { ListDocumentsUseCase } from "../../../application/use-cases/list-documents.use-case";
import { ValidationError } from "../../../domain/shared/domain-error";
import { Actor } from "../auth/actor.decorator";
import { ContractDocumentResponseDto } from "../dto/api-responses.dto";

@ApiTags("documents")
@ApiBearerAuth("bearer")
@Controller("api/v1/contracts/:contractId/documents")
export class DocumentsController {
  constructor(
    private readonly attachDocument: AttachDocumentUseCase,
    private readonly listDocuments: ListDocumentsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "List documents for a contract" })
  @ApiOkResponse({ type: ContractDocumentResponseDto, isArray: true })
  list(@Actor() actor: ActorContext, @Param("contractId") contractId: string) {
    return this.listDocuments.execute(actor, contractId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Upload a current or proposal document",
    description:
      "Allowed types: PDF, Excel (.xlsx/.xls), CSV, Markdown (.md), plain text (.txt), Word (.docx). Max 15 MB.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "role"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "pdf, xlsx, xls, csv, md, txt, docx",
        },
        role: { type: "string", enum: ["current", "proposal"] },
      },
    },
  })
  @ApiCreatedResponse({ type: ContractDocumentResponseDto })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @Actor() actor: ActorContext,
    @Param("contractId") contractId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("role") role: string | undefined,
  ) {
    if (!file) {
      throw new ValidationError("Multipart field 'file' is required");
    }
    if (!role?.trim()) {
      throw new ValidationError("Form field 'role' is required (current|proposal)");
    }
    return this.attachDocument.execute({
      actor,
      contractId,
      role: role.trim(),
      fileName: file.originalname,
      contentType: file.mimetype || "application/octet-stream",
      body: file.buffer,
    });
  }
}
