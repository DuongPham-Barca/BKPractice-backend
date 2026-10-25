export { Permission } from './rbac/entities/permission.entity';
export { Role } from './rbac/entities/role.entity';
export { Profile } from './users/entities/profile.entity';
export { RefreshToken } from './users/entities/refresh-token.entity';
export { User } from './users/entities/user.entity';
export { AuthSession, ExternalIdentity } from '@/modules/auth/infrastructure/persistence';

import { Permission } from './rbac/entities/permission.entity';
import { Role } from './rbac/entities/role.entity';
import { Profile } from './users/entities/profile.entity';
import { RefreshToken } from './users/entities/refresh-token.entity';
import { User } from './users/entities/user.entity';

import { AuthSession, ExternalIdentity } from '@/modules/auth/infrastructure/persistence';

export const identityEntities = [User, Profile, Role, Permission, RefreshToken, AuthSession, ExternalIdentity];
