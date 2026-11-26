import { z } from 'zod';

export type NodeEnv = 'development' | 'production' | 'test';
export type AppLogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'log'
  | 'debug'
  | 'verbose';
export type LogFormat = 'json' | 'pretty';

export class EnvValidationError extends Error {
  readonly issues: readonly { path: string; message: string }[];

  constructor(
    scope: string,
    issues: readonly { path: string; message: string }[],
  ) {
    const details = issues
      .map((issue) => `  - ${issue.path}: ${issue.message}`)
      .join('\n');
    super(`Invalid ${scope} environment configuration:\n${details}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

const optionalNonEmptyString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);

function urlWithProtocols(protocols: readonly string[], label: string) {
  const allowed = protocols.map((p) => `${p}//`).join(', ');
  return z.string().superRefine((value, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: `Expected a valid ${label} URL (${allowed})`,
      });
      return;
    }

    if (!protocols.includes(parsed.protocol) || !parsed.hostname) {
      ctx.addIssue({
        code: 'custom',
        message: `Expected a valid ${label} URL with protocol ${allowed}`,
      });
    }
  });
}

export const postgresUrlSchema = urlWithProtocols(
  ['postgres:', 'postgresql:'],
  'PostgreSQL',
);

const redisUrlSchema = urlWithProtocols(['redis:', 'rediss:'], 'Redis');

const mqttUrlSchema = urlWithProtocols(
  ['mqtt:', 'mqtts:', 'ws:', 'wss:'],
  'MQTT',
);

const httpUrlSchema = urlWithProtocols(['http:', 'https:'], 'HTTP(S)');

const nodeEnvSchema = z.preprocess(
  emptyToUndefined,
  z.enum(['development', 'production', 'test']).default('development'),
);

const logLevelSchema = z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);
    return typeof normalized === 'string'
      ? normalized.toLowerCase()
      : normalized;
  },
  z.enum(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']).optional(),
);

const logFormatSchema = z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);
    return typeof normalized === 'string'
      ? normalized.toLowerCase()
      : normalized;
  },
  z.enum(['json', 'pretty']).optional(),
);

const healthCheckTimeoutSchema = z.preprocess((value) => {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) {
    return 2000;
  }
  if (typeof normalized === 'number') {
    return normalized;
  }
  if (typeof normalized === 'string' && /^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }
  return Number.NaN;
}, z.int('Expected an integer between 100 and 30000').min(100, 'Expected an integer between 100 and 30000').max(30000, 'Expected an integer between 100 and 30000'));

const portSchema = z.preprocess((value) => {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) {
    return 3001;
  }
  if (typeof normalized === 'number') {
    return normalized;
  }
  if (typeof normalized === 'string' && /^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }
  return Number.NaN;
}, z.int('Expected an integer between 1 and 65535').min(1, 'Expected an integer between 1 and 65535').max(65535, 'Expected an integer between 1 and 65535'));

function parseOrigin(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    !parsed.hostname ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    return null;
  }
  return parsed.origin;
}

const corsOriginSchema = z.preprocess(
  (value) => emptyToUndefined(value) ?? 'http://localhost:3000',
  z
    .string()
    .transform((value, ctx): string | string[] => {
      const entries = value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

      if (entries.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Expected one or more comma-separated http(s) origins (e.g. http://localhost:3000)',
        });
        return z.NEVER;
      }

      const normalized: string[] = [];
      for (const entry of entries) {
        const origin = parseOrigin(entry);
        if (!origin) {
          ctx.addIssue({
            code: 'custom',
            message:
              'Expected valid http(s) origin(s) without path, query, or hash (e.g. http://localhost:3000)',
          });
          return z.NEVER;
        }
        normalized.push(origin);
      }

      return normalized.length === 1 ? normalized[0] : normalized;
    }),
);

function requiredUrl(schema: z.ZodString, description: string) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string({
        error: () => `Required (${description})`,
      })
      .pipe(schema),
  );
}

function optionalUrl(schema: z.ZodString) {
  return z.preprocess(emptyToUndefined, schema.optional());
}

export const serverEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: portSchema,
    CORS_ORIGIN: corsOriginSchema,
    LOG_LEVEL: logLevelSchema,
    LOG_FORMAT: logFormatSchema,
    HEALTH_CHECK_TIMEOUT_MS: healthCheckTimeoutSchema,
    DATABASE_URL: requiredUrl(
      postgresUrlSchema,
      'expected postgres:// or postgresql:// URL',
    ),
    DATABASE_URL_UNPOOLED: optionalUrl(postgresUrlSchema),
    REDIS_URL: requiredUrl(
      redisUrlSchema,
      'expected redis:// or rediss:// URL',
    ),
    MQTT_URL: requiredUrl(
      mqttUrlSchema,
      'expected mqtt://, mqtts://, ws://, or wss:// URL',
    ),
    MQTT_USERNAME: optionalNonEmptyString,
    MQTT_PASSWORD: optionalNonEmptyString,
    OBSERVE_APP_KEY: optionalNonEmptyString,
    OBSERVE_APP_SECRET: optionalNonEmptyString,
    OBSERVE_ENDPOINT: optionalUrl(httpUrlSchema),
  })
  .superRefine((env, ctx) => {
    const hasKey = env.OBSERVE_APP_KEY !== undefined;
    const hasSecret = env.OBSERVE_APP_SECRET !== undefined;
    if (hasKey && !hasSecret) {
      ctx.addIssue({
        code: 'custom',
        path: ['OBSERVE_APP_SECRET'],
        message: 'Required when OBSERVE_APP_KEY is set',
      });
    } else if (!hasKey && hasSecret) {
      ctx.addIssue({
        code: 'custom',
        path: ['OBSERVE_APP_KEY'],
        message: 'Required when OBSERVE_APP_SECRET is set',
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const simulatorEnvSchema = z.object({
  MQTT_URL: z.preprocess(
    (value) => emptyToUndefined(value) ?? 'mqtt://localhost:1883',
    mqttUrlSchema,
  ),
  MQTT_USERNAME: optionalNonEmptyString,
  MQTT_PASSWORD: optionalNonEmptyString,
});

export type SimulatorEnv = z.infer<typeof simulatorEnvSchema>;

function formatIssues(
  issues: readonly z.core.$ZodIssue[],
): { path: string; message: string }[] {
  return issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '(env)',
    message: issue.message,
  }));
}

export function validateServerEnv(
  raw: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new EnvValidationError('server', formatIssues(result.error.issues));
  }
  return result.data;
}

export function validateSimulatorEnv(
  raw: NodeJS.ProcessEnv = process.env,
): SimulatorEnv {
  const result = simulatorEnvSchema.safeParse(raw);
  if (!result.success) {
    throw new EnvValidationError(
      'simulator',
      formatIssues(result.error.issues),
    );
  }
  return result.data;
}
