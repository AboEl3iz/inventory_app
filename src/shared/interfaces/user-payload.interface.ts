import { Role } from 'src/common/decorator/roles.decorator';

/**
 * JWT payload attached to every authenticated request via AuthenticationGuard.
 * This replaces the `user: any` pattern throughout the codebase.
 */
export interface IUserPayload {
  /** User UUID */
  id: string;
  email: string;
  /** User name */
  name: string;
  /** User role (admin, manager, cashier) */
  role: Role;
  /** Branch UUID the user is assigned to (empty string if unassigned) */
  branchId: string;
  /** Flag for system-level operations (e.g., invoice processing) */
  isSystemOperation?: boolean;
}
