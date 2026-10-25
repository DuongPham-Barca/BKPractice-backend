import { z } from 'zod';

export type ServiceName =
  | 'api-gateway'
  | 'identity-service'
  | 'learning-service'
  | 'submission-service'
  | 'judge-service'
  | 'community-service';

const commonSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
});

const port = z.coerce.number().int().min(1).max(65535);
const secret = z.string().min(32);
const url = z.url();

const serviceSchemas: Record<ServiceName, z.ZodObject> = {
  'api-gateway': commonSchema.extend({
    API_GATEWAY_PORT: port.default(3000),
    JWT_ACCESS_SECRET: secret,
    IDENTITY_SERVICE_URL: url,
    LEARNING_SERVICE_URL: url,
    SUBMISSION_SERVICE_URL: url,
    COMMUNITY_SERVICE_URL: url,
    REDIS_URL: url,
    CORS_ORIGINS: z.string().default('http://localhost:3001'),
  }),
  'identity-service': commonSchema.extend({
    IDENTITY_SERVICE_PORT: port.default(3001),
    IDENTITY_DATABASE_URL: url,
    JWT_ACCESS_SECRET: secret,
    JWT_REFRESH_SECRET: secret,
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    R2_ACCOUNT_ID: z.string().regex(/^[0-9a-f]{32}$/),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_REFERENCE_SIGNING_KEY: z.string().min(32),
    R2_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
    R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600),
    R2_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(52428800),
    R2_ALLOWED_CONTENT_TYPES: z
      .string()
      .refine((value) =>
        value
          .split(',')
          .every((item) => ['image/png', 'image/jpeg', 'image/webp'].includes(item.trim())),
      ),
    R2_CLEANUP_GRACE_SECONDS: z.coerce.number().int().positive(),
  }),
  'learning-service': commonSchema.extend({
    LEARNING_SERVICE_PORT: port.default(3002),
    LEARNING_DATABASE_URL: url,
    RABBITMQ_URL: url,
    INTERNAL_SERVICE_SECRET: secret,
  }),
  'submission-service': commonSchema.extend({
    SUBMISSION_SERVICE_PORT: port.default(3003),
    SUBMISSION_DATABASE_URL: url,
    RABBITMQ_URL: url,
    REDIS_URL: url,
    LEARNING_INTERNAL_URL: url,
    INTERNAL_SERVICE_SECRET: secret,
  }),
  'judge-service': commonSchema.extend({
    JUDGE_SERVICE_PORT: port.default(3004),
    RABBITMQ_URL: url,
    JUDGE_WORKSPACE_ROOT: z.string().min(1).default('/tmp/bkpractice-judge'),
    JUDGE_MAX_OUTPUT_BYTES: z.coerce.number().int().positive().default(1048576),
    JUDGE_DOCKER_BINARY: z.string().min(1).default('docker'),
    JUDGE_DOCKER_WORKSPACE_ROOT: z.string().min(1).optional(),
  }),
  'community-service': commonSchema.extend({
    COMMUNITY_SERVICE_PORT: port.default(3005),
    COMMUNITY_DATABASE_URL: url,
  }),
};

export function validateEnvironment(service: ServiceName) {
  return (environment: Record<string, unknown>): Record<string, unknown> => {
    const result = serviceSchemas[service].safeParse(environment);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid environment for ${service}: ${issues}`);
    }
    return { ...environment, ...result.data };
  };
}
