import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../domain/shared/domain-error";

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.BAD_REQUEST;
    if (exception instanceof NotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof ForbiddenError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof ConflictError) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof ValidationError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }
    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
