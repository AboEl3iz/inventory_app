import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  httpRequestsTotal,
  httpRequestDuration,
} from 'src/module/metrics/metrics.controller';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    // Ignore metrics endpoint itself
    if (req.url === '/api/v1/metrics' || req.url === '/metrics') {
      return next.handle();
    }

    const endTimer = httpRequestDuration.startTimer({
      method: req.method,
      route: req.route?.path || req.path,
    });

    return next.handle().pipe(
      tap(() => {
        const statusCode = res.statusCode;
        endTimer({ status_code: statusCode });
        httpRequestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: statusCode,
        });
      }),
      catchError((err) => {
        const statusCode = err?.status || err?.response?.statusCode || 500;
        endTimer({ status_code: statusCode });
        httpRequestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: statusCode,
        });
        throw err;
      }),
    );
  }
}
