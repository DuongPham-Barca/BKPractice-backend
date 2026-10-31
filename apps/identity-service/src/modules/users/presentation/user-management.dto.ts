import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  limit?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], example: 'false' })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeDeleted?: string;
}

export class UserAdminResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty({ type: String, nullable: true }) studentId!: string | null;
  @ApiProperty() email!: string;
  @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'LOCKED', 'PENDING'] }) status!: string;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty({ type: Date }) createdAt!: Date;
  @ApiProperty({ type: Date, nullable: true }) deletedAt!: Date | null;
}

export class ListUsersResponseDto {
  @ApiProperty({ type: [UserAdminResponseDto] }) items!: UserAdminResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() hasMore!: boolean;
}
