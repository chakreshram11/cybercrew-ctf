import * as dotenv from 'dotenv';
import * as path from 'path';

// Pre-load environment variables before NestJS module resolution
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const corsOrigin = configService.get<string>('corsOrigin') || 'http://localhost:5173';
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Managed by reverse proxy or API-only consumers
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cross-Origin Resource Sharing
  app.enableCors({
    origin: [corsOrigin, 'https://ctf.cybercrew.online', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-Id'],
  });

  // Global API Routing Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'], // Keep /health at root for container orchestrator probes
  });

  // Global Input Validation & Sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI / Swagger Documentation (Protected in production if needed)
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Cyber Crew CTF Engine API')
      .setDescription(
        'Official API specification for Cyber Crew Club Capture The Flag competition platform.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger OpenAPI Documentation available at http://localhost:${port}/docs`);
  }

  await app.listen(port);
  logger.log(`Cyber Crew CTF Backend listening on port ${port} [${nodeEnv}]`);
}

bootstrap();
