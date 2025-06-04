import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerErrorInterceptor, Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  // Use NestLogger for this initial message before Pino is fully initialized
  NestLogger.log(`Setting logger level via LOG_LEVEL env var (default: info). Using Pino for structured logging.`);

  const app = await NestFactory.create(AppModule);

  app.useLogger(app.get(PinoLogger));

  // Add interceptor for logging unhandled errors through Pino
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties that do not have any decorators
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted values are provided
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Analytodon API')
    .setDescription('This is the API documentation for Analytodon - the open-source Mastodon analytics tool.')
    .setVersion('1.0')
    .addBearerAuth() // If you use Bearer authentication
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger UI will be available at /api

  await app.listen(process.env.PORT || 3000);
  NestLogger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
