import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const methodRoles =
      this.reflector.get<string[]>('roles', context.getHandler()) || [];
    const classRoles =
      this.reflector.get<string[]>('roles', context.getClass()) || [];

    // الأولوية للميثود
    const roles = methodRoles.length > 0 ? methodRoles : classRoles;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!roles || roles.length === 0) {
      return true;
    }

    if (!user || !user.role) {
      throw new UnauthorizedException('Unauthorized');
    }

    return roles.includes(user.role);
  }
}
