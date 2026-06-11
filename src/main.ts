import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createRateLimitMiddleware, buildRateLimitOptionsFromEnv } from './common/security/rate-limit.middleware';
import { securityHeadersMiddleware } from './common/security/security-headers.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Nota para mí:
   * En Railway el backend está detrás de proxy. Activo trust proxy para que
   * Express pueda reconocer correctamente cabeceras como x-forwarded-for.
   */
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(securityHeadersMiddleware);
  app.use(createRateLimitMiddleware(buildRateLimitOptionsFromEnv()));

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://polleria-frontend-next.vercel.app',
      'https://polleriaelsabrosito.com',
      'https://trendy-clothing-store.vercel.app',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pollería API')
    .setDescription('API backend de la pollería')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc);

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);
  console.log(`Backend iniciado correctamente en puerto ${port}`);
}
bootstrap();