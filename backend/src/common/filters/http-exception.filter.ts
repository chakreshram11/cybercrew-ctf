import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected server error occurred. Contact CTF staff.';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errorCode = `HTTP_${status}`;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        errorCode = resObj.code || resObj.error || `HTTP_${status}`;
        if (Array.isArray(resObj.message)) {
          // Class-validator validation errors array
          details = resObj.message;
          message = 'Validation failed on submitted payload.';
          errorCode = 'VALIDATION_FAILED';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${request.method}] ${request.url} - Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      // Ensure zero stack trace or internal SQL leakage to untrusted client
      message = 'Internal security infrastructure error.';
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details ? { details } : {}),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
