import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from 'prom-client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ prefix: 'inventory_app_' });

// ─── Custom Metrics ───
export const httpRequestsTotal = new Counter({
  name: 'inventory_app_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDuration = new Histogram({
  name: 'inventory_app_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const activeDbConnections = new Counter({
  name: 'inventory_app_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation'],
});

export const emailsSent = new Counter({
  name: 'inventory_app_emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['template', 'status'],
});

export const jobsProcessed = new Counter({
  name: 'inventory_app_jobs_processed_total',
  help: 'Total number of background jobs processed',
  labelNames: ['queue', 'status'],
});

@Controller('metrics')
@ApiTags('Monitoring')
export class MetricsController {
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
