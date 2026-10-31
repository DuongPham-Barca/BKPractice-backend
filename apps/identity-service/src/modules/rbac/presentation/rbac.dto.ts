import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { RoleName } from '@/modules/rbac/domain';

export class AssignRoleRequestDto {
  @ApiProperty({
    enum: [RoleName.Student, RoleName.Lecturer],
    description: 'Only STUDENT and LECTURER can be assigned.',
  })
  @IsEnum(RoleName)
  role!: RoleName;
}

export class UserRolesResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: RoleName, isArray: true })
  roles!: RoleName[];
}
