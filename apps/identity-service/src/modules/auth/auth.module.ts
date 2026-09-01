import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from '../rbac/entities/role.entity';
import { Profile } from '../users/entities/profile.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile, Role, RefreshToken])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
