import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { createAppValidationPipe } from './validation.pipe.js';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useFactory: createAppValidationPipe,
    },
  ],
})
export class ExceptionsModule {}
