import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const methodRoles = this.reflector.get<string[]>('roles', context.getHandler()) || [];
    const classRoles = this.reflector.get<string[]>('roles', context.getClass()) || [];
    console.log('Method metadata:', this.reflector.get<string[]>('roles', context.getHandler()));
    console.log('Class metadata:', this.reflector.get<string[]>('roles', context.getClass()));

    // الأولوية للميثود
    const roles = methodRoles.length > 0 ? methodRoles : classRoles;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('User role:', user.role);
    console.log('Required roles:', roles);

    if (!roles || roles.length === 0) {
      return true;
    }

    if (!user || !user.role) {
      throw new UnauthorizedException('Unauthorized');
    }

    return roles.includes(user.role);
  }
}