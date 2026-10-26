export {
  AuthSession,
  ExternalIdentity,
  RefreshToken,
} from '@/modules/auth/infrastructure/persistence';
export { Profile } from '@/modules/profiles/infrastructure/persistence/profile.entity';
export { Permission } from '@/modules/rbac/infrastructure/persistence/permission.entity';
export { Role } from '@/modules/rbac/infrastructure/persistence/role.entity';
export { User } from '@/modules/users/infrastructure/persistence/user.entity';

import {
  AuthSession,
  ExternalIdentity,
  RefreshToken,
} from '@/modules/auth/infrastructure/persistence';
import { Profile } from '@/modules/profiles/infrastructure/persistence/profile.entity';
import { Permission } from '@/modules/rbac/infrastructure/persistence/permission.entity';
import { Role } from '@/modules/rbac/infrastructure/persistence/role.entity';
import { User } from '@/modules/users/infrastructure/persistence/user.entity';

export const identityEntities = [
  User,
  Profile,
  Role,
  Permission,
  RefreshToken,
  AuthSession,
  ExternalIdentity,
];
