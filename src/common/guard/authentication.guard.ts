import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private jwtService: JwtService) { }
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(context);
    if (!token) {
      throw new ForbiddenException('Authentication token is missing');
    }
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload; // Attach the user payload to the request object
      Logger.debug('User payload:', payload);
    } catch (error) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    // Attach the token to the request object
    return true;
  }
  private extractTokenFromHeader(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return null;
  }
}