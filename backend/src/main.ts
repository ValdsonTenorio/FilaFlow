import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { logger } from './common/logging/logger';
import { Environment } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Environment, true>);
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  app.useLogger({ log: (message) => logger.info(message), error: (message) => logger.error(message), warn: (message) => logger.warn(message), debug: (message) => logger.debug(message), verbose: (message) => logger.trace(message), fatal: (message) => logger.fatal(message), setLogLevels: () => undefined });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.getHttpAdapter().getInstance().set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.use(pinoHttp({ logger }));
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], baseUri: ["'self'"], frameAncestors: ["'none'"], objectSrc: ["'none'"] } } }));
  app.use(cookieParser(config.get('SESSION_SECRET', { infer: true })));
  app.enableCors({ origin: [config.get('FRONTEND_ORIGIN', { infer: true })], credentials: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: false } }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TimeoutInterceptor());

  if (!isProduction) {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('FilaFlow API').setVersion('1').build());
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
