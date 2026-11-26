import { type DynamicModule, Global, Module } from '@nestjs/common';
import { loadEnvIfPresent } from '../load-env.js';
import { validateServerEnv } from './env.schema.js';
import { EnvService } from './env.service.js';

export interface EnvModuleOptions {
  /** Override raw environment object (primarily for tests). */
  env?: NodeJS.ProcessEnv;
  /** Whether to load `.env` from disk before validating. Defaults to true when `env` is not provided. */
  loadEnvFile?: boolean;
  /** Optional custom `.env` file path when `loadEnvFile` is true. */
  envFilePath?: string;
}

function createEnvService(options: EnvModuleOptions = {}): EnvService {
  const shouldLoadFile = options.loadEnvFile ?? options.env === undefined;
  if (shouldLoadFile) {
    loadEnvIfPresent(options.envFilePath);
  }
  const validated = validateServerEnv(options.env ?? process.env);
  return new EnvService(Object.freeze(validated));
}

@Global()
@Module({
  providers: [
    {
      provide: EnvService,
      useFactory: () => createEnvService(),
    },
  ],
  exports: [EnvService],
})
export class EnvModule {
  static forRoot(options: EnvModuleOptions = {}): DynamicModule {
    return {
      module: EnvModule,
      global: true,
      providers: [
        {
          provide: EnvService,
          useFactory: () => createEnvService(options),
        },
      ],
      exports: [EnvService],
    };
  }
}
