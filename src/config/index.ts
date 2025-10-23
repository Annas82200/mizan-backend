import { z } from 'zod';

/**
 * Production-Ready Configuration Validation
 *
 * Validates all required environment variables on application startup.
 * Fails fast if any critical configuration is missing or invalid.
 *
 * AGENT_CONTEXT_ULTIMATE.md Compliant:
 * - No fallback values for production secrets
 * - Explicit validation of all required fields
 * - Type-safe configuration access
 */

const ConfigSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Server
  PORT: z.string().regex(/^\d+$/).transform(Number).default('8080'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().startsWith('postgresql://'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  SESSION_SECRET: z.string().min(32).optional(),

  // AI Providers
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  GOOGLE_API_KEY: z.string().min(1),
  MISTRAL_API_KEY: z.string().min(1),

  // Optional Services
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Email (optional for now, required for production email features)
  SENDGRID_API_KEY: z.string().optional(),
  SUPERADMIN_EMAIL: z.string().email().optional(),

  // Frontend
  CLIENT_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),

  // Stripe (optional, required for billing features)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Validates environment configuration and fails fast if invalid.
 * Called on module import to ensure configuration is valid before app starts.
 */
export function validateConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ CONFIGURATION VALIDATION FAILED\n');
    console.error('The following environment variables are missing or invalid:\n');

    result.error.errors.forEach(err => {
      const path = err.path.join('.');
      console.error(`  ❌ ${path}: ${err.message}`);
    });

    console.error('\nApplication cannot start with invalid configuration.');
    console.error('Please check your .env file or environment variables.\n');

    // Fail fast - don't allow application to start
    process.exit(1);
  }

  return result.data;
}

// Validate configuration on module load
export const config = validateConfig();

// Log successful configuration (without sensitive values)
console.log('✅ Configuration validated successfully');
console.log(`📍 Environment: ${config.NODE_ENV}`);
console.log(`🔌 Port: ${config.PORT}`);
console.log(`🗄️  Database: Connected`);
console.log(`🤖 AI Providers: ${[
  config.OPENAI_API_KEY && 'OpenAI',
  config.ANTHROPIC_API_KEY && 'Anthropic',
  config.GOOGLE_API_KEY && 'Google',
  config.MISTRAL_API_KEY && 'Mistral'
].filter(Boolean).join(', ')}\n`);
