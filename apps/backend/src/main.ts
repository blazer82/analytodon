import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips properties that do not have any decorators
    forbidNonWhitelisted: true, // Throws an error if non-whitelisted values are provided
    transform: true, // Automatically transform payloads to DTO instances
  }));

  const config = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription('The backend API description')
    .setVersion('1.0')
    .addBearerAuth() // If you use Bearer authentication
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger UI will be available at /api

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
