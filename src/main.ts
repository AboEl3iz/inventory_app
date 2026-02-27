import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MetricsInterceptor } from './common/interceptor/metrics.interceptor';

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
            }),
          ),
        }),
      ],
    }),
  });

  const configService = app.get(ConfigService);

  // ─── CORS ───
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ─── Global Prefix ───
  app.setGlobalPrefix('api/v1');

  // ─── Validation ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── Interceptors ───
  app.useGlobalInterceptors(new MetricsInterceptor());

  // ─── Swagger ───
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Inventory Management System API')
    .setDescription(
      'Complete API documentation for Inventory Management System — ' +
        'Manage products, inventory, suppliers, users, invoices, and more',
    )
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

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, documentFactory);

  // ─── Start ───
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application running on port ${port}`, 'Bootstrap');
}

bootstrap();
