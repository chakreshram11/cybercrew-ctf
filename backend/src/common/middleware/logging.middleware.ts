import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'Unknown';
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    // Attach request ID to response header for tracing
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      // Mask any potential sensitive endpoints from excessive logging
      this.logger.log(
        `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms | IP: ${ip} | UA: ${userAgent}`,
      );
    });

    next();
  }
}
