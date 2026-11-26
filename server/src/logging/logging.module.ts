import {
  Global,
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { AppLogger } from './app-logger.service.js';
import { HttpLoggingMiddleware } from './http-logging.middleware.js';

@Global()
@Module({
  providers: [AppLogger, HttpLoggingMiddleware],
  exports: [AppLogger],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLoggingMiddleware).forRoutes('{*path}');
  }
}
