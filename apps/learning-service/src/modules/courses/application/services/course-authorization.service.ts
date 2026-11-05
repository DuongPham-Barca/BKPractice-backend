import { ForbiddenError } from '@learning/modules/courses/application/errors/application-errors';
import type { Principal } from '@learning/modules/courses/application/models/principal';

const REQUIRED_ROLE = 'LECTURER';

export class CourseAuthorizationService {
  requirePermission(principal: Principal, permission: string): void {
    if (!principal.roles.includes(REQUIRED_ROLE)) throw new ForbiddenError('Missing LECTURER role');
    if (!principal.permissions.includes(permission))
      throw new ForbiddenError(`Missing ${permission}`);
  }

  requireOwnership(createdBy: string, principal: Principal): void {
    if (createdBy !== principal.userId) throw new ForbiddenError('Not the owner');
  }
}
