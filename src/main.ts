import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MetricsInterceptor } from './common/interceptor/metrics.interceptor';

const START_MODE = process.env.START_MODE || 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize({ all: true }),
            winston.format.printf(({ level, message, timestamp }) => {
              return `[${timestamp}] ${level}: [${START_MODE.toUpperCase()}] ${message}`;
            }),
          ),
        }),
      ],
    }),
  });

  const configService = app.get(ConfigService);

  // ─── Mode: SCHEDULER ─────────────────────────────────────────────────────
  // Registers repeatable BullMQ jobs in Redis and stays alive as a lightweight
  // pod. Exposes a minimal health port so Kubernetes probes keep it running.
  if (START_MODE === 'scheduler') {
    app.setGlobalPrefix('internal');

    // ─── Health endpoint for K8s liveness/readiness probes ────────────────
    // Route: GET /internal/health  (matches the probe path in 04-cronjob.yaml)
    // Registered via raw Express middleware so it works with any NestJS modules.
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/internal/health', (_req: any, res: any) => {
      res.status(200).json({ status: 'ok', mode: 'scheduler' });
    });

    const port = configService.get<number>('PORT') || 3001;
    await app.listen(port);
    Logger.log(
      `⏰ Scheduler pod running on port ${port} — repeatable jobs registered in Redis`,
      'Bootstrap',
    );
    return;
  }

  // ─── Mode: WORKER ─────────────────────────────────────────────────────────
  // Pure BullMQ consumer — no HTTP server, no Swagger, no cron.
  if (START_MODE === 'worker') {
    await app.init(); // NestJS context only, no HTTP listener
    Logger.log(
      '⚙️  Worker pod started — consuming jobs from Redis queues',
      'Bootstrap',
    );
    return;
  }

  // ─── Mode: API (default) ──────────────────────────────────────────────────
  // Full HTTP server with Swagger, CORS, validation, and metrics.

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // ─── Health endpoint for K8s liveness/readiness/startup probes ────────────
  // Route: GET /api/v1/health  (matches probe path in 02-api.yaml)
  // Must be registered AFTER setGlobalPrefix so the prefix is applied.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/v1/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', mode: 'api' });
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new MetricsInterceptor());

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

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  Logger.log(`🚀 API server running on port ${port}`, 'Bootstrap');
}

bootstrap();
