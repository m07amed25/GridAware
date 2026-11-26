import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { EnvService } from './config/env.service.js';
import { loadEnvIfPresent } from './load-env.js';
import { AppLogger } from './logging/app-logger.service.js';

async function bootstrap() {
  loadEnvIfPresent();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    instrument: ObserveInstrument,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const env = app.get(EnvService);
  app.setGlobalPrefix('api/v1');
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
    },
    'Bootstrap',
  );
}
await bootstrap();
