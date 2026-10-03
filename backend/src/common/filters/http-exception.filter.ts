import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const message = this.getSafeMessage(exceptionResponse, status);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getSafeMessage(response: string | object | undefined, status: number): string | string[] {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Erro interno do servidor.';
    }

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = response.message;
      if (typeof message === 'string' || Array.isArray(message)) return message;
    }

    return typeof response === 'string' ? response : 'Não foi possível concluir a solicitação.';
  }
}
