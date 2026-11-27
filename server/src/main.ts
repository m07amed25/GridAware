import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module.js';
import { EnvService } from './config/env.service.js';
import { loadEnvIfPresent } from './load-env.js';
import { AppLogger } from './logging/app-logger.service.js';
import { setupSwagger, SWAGGER_UI_PATH } from './swagger/setup-swagger.js';

async function bootstrap() {
  loadEnvIfPresent();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    instrument: ObserveInstrument,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const env = app.get(EnvService);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  if (env.swaggerEnabled) {
    setupSwagger(app);
  }
  app.enableCors({
    origin: env.corsOrigin,
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(env.port);
  logger.log(
    `GridAware server listening on port ${env.port}`,
    {
      port: env.port,
      environment: env.nodeEnv,
      logLevel: env.logLevel,
      logFormat: env.logFormat,
      ...(env.swaggerEnabled ? { swaggerPath: `/${SWAGGER_UI_PATH}` } : {}),
    },
    'Bootstrap',
  );
}
await bootstrap();
