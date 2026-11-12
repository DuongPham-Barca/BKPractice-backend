import { ForbiddenError } from '@/modules/courses/application/errors';
import type { Principal } from '@/modules/courses/application/models';

export class CourseAuthorizationService {
  requirePermission(principal: Principal, permission: string): void {
    if (!principal.roles.includes('ADMIN') && !principal.roles.includes('LECTURER'))
      throw new ForbiddenError('Missing content manager role');
    if (!principal.permissions.includes(permission))
      throw new ForbiddenError(`Missing ${permission}`);
  }

  requireOwnership(principal: Principal, createdBy: string): void {
    if (!principal.roles.includes('ADMIN') && principal.userId !== createdBy)
      throw new ForbiddenError('Content belongs to another lecturer');
  }
}
