import { ForbiddenError } from '@/modules/courses/application/errors';
import type { Principal } from '@/modules/courses/application/models';

const REQUIRED_ROLE = 'ADMIN';

export class CourseAuthorizationService {
  requirePermission(principal: Principal, permission: string): void {
    if (!principal.roles.includes(REQUIRED_ROLE)) throw new ForbiddenError('Missing ADMIN role');
    if (!principal.permissions.includes(permission))
      throw new ForbiddenError(`Missing ${permission}`);
  }
}
