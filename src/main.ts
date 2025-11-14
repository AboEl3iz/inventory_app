import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(

            winston.format.timestamp(),
            winston.format.colorize({ all: true }),
             winston.format.printf(({ level, message, timestamp }) => {
              return `[${timestamp}] ${level}: ${message}`;
            })
          ),
        }),
      ],
    }),
  });
   const config = new DocumentBuilder()
    .setTitle('Inventory Management System API')
    .setDescription('Complete API documentation for Inventory Management System - Manage products, inventory, suppliers, users, invoices, and more')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'access-token',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Products', 'Product management including variants and attributes')
    .addTag('Categories', 'Product category management')
    .addTag('Inventory', 'Inventory tracking and management')
    .addTag('Stock', 'Stock level management')
    .addTag('Suppliers', 'Supplier information and management')
    .addTag('Purchases', 'Purchase order management')
    .addTag('Invoices', 'Invoice creation and management')
    .addTag('Users', 'User account management')
    .addTag('Branches', 'Branch location management')
    .addTag('Events', 'System event tracking')
    .addTag('Scheduler', 'Scheduled tasks management')
    .addTag('Reports', 'Reporting and analytics data')
    .addTag('Analytics', 'Business analytics and insights')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);
  console.log('🔥 App started');

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
