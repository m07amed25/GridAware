import { type INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

export const SWAGGER_UI_PATH = 'api/docs';
export const SWAGGER_JSON_PATH = 'api/docs-json';
export const SWAGGER_YAML_PATH = 'api/docs-yaml';

export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setOpenAPIVersion('3.1.0')
    .setTitle('GridAware API')
    .setDescription(
      'Interactive OpenAPI specification for the GridAware B2B SaaS backend.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer JWT access token',
      },
      'bearerAuth',
    )
    .addCookieAuth('ga_access', {
      type: 'apiKey',
      in: 'cookie',
      name: 'ga_access',
      description: 'HttpOnly short-lived access JWT cookie',
    })
    .addCookieAuth('ga_refresh', {
      type: 'apiKey',
      in: 'cookie',
      name: 'ga_refresh',
      description: 'HttpOnly rotating refresh credential cookie',
    })
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'Double-submit CSRF token matching ga_csrf cookie',
      },
      'csrfToken',
    )
    .addTag('auth', 'Authentication & Session Management')
    .addTag('identity', 'Current User Identity')
    .addTag('Health', 'Operational liveness and dependency readiness probes')
    .addTag('System', 'Root service endpoints')
    .build();
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildSwaggerConfig());
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_UI_PATH, app, () => createSwaggerDocument(app), {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    yamlDocumentUrl: SWAGGER_YAML_PATH,
    customSiteTitle: 'GridAware API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
