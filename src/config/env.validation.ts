import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(4000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_PREFIX: Joi.string().default('api/v1'),
  APP_URL: Joi.string().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),

  JWT_SECRET: Joi.string().min(10).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().optional(),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASS: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().email().optional(),

  APISUNAT_BASE_URL: Joi.string().uri().optional(),
  APISUNAT_TOKEN: Joi.string().allow('').optional(),

  SUPABASE_URL: Joi.string().uri().optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').optional(),
  SUPABASE_ROP_IMAGES_BUCKET: Joi.string().default('rop-product-images'),

  RATE_LIMIT_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_GENERAL_MAX: Joi.number().default(180),
  RATE_LIMIT_AUTH_MAX: Joi.number().default(12),
  RATE_LIMIT_UPLOAD_MAX: Joi.number().default(30),
  RATE_LIMIT_STRICT_MAX: Joi.number().default(40),
  RATE_LIMIT_MAX_STRIKES: Joi.number().default(5),
  RATE_LIMIT_BLOCK_MS: Joi.number().default(900000),
});
