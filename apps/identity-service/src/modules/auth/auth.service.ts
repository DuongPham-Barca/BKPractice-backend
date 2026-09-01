import { randomUUID } from 'node:crypto';

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, Repository } from 'typeorm';

import { Role, RoleName } from '../rbac/entities/role.entity';
import { Profile } from '../users/entities/profile.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { AccountStatus, User } from '../users/entities/user.entity';

import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

interface RefreshPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string } & TokenPair> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('Email is already registered');
    }

    let studentRole = await this.roles.findOneBy({ name: RoleName.Student });
    if (!studentRole) {
      studentRole = await this.roles.save(
        this.roles.create({ name: RoleName.Student, description: 'Default student role' }),
      );
    }

    const user = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        User,
        manager.create(User, {
          email,
          passwordHash: await argon2.hash(dto.password),
          status: AccountStatus.Active,
          roles: [studentRole],
        }),
      );
      await manager.save(
        Profile,
        manager.create(Profile, { user: created, displayName: dto.displayName.trim() }),
      );
      return created;
    });

    return { userId: user.id, ...(await this.issueTokenPair(user)) };
  }

  async login(dto: LoginDto): Promise<{ userId: string } & TokenPair> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .getOne();

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    if (user.status !== AccountStatus.Active) {
      throw new UnauthorizedException('Account is not active');
    }
    return { userId: user.id, ...(await this.issueTokenPair(user)) };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(rawToken);
    const stored = await this.refreshTokens.findOneBy({
      tokenId: payload.jti,
      userId: payload.sub,
    });
    if (!stored || stored.revokedAt || !(await argon2.verify(stored.tokenHash, rawToken))) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }

    stored.revokedAt = new Date();
    await this.refreshTokens.save(stored);
    const user = await this.users.findOneByOrFail({ id: payload.sub });
    return this.issueTokenPair(user);
  }

  async logout(rawToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(rawToken);
      await this.refreshTokens
        .createQueryBuilder()
        .update()
        .set({ revokedAt: new Date() })
        .where('token_id = :tokenId', { tokenId: payload.jti })
        .andWhere('user_id = :userId', { userId: payload.sub })
        .andWhere('revoked_at IS NULL')
        .execute();
    } catch {
      return;
    }
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const roles = user.roles.map((role) => role.name);
    const tokenId = randomUUID();
    const accessTtl = this.config.getOrThrow<string>(
      'JWT_ACCESS_TTL',
    ) as `${number}${'s' | 'm' | 'h' | 'd'}`;
    const refreshTtl = this.config.getOrThrow<string>(
      'JWT_REFRESH_TTL',
    ) as `${number}${'s' | 'm' | 'h' | 'd'}`;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, roles, type: 'access' },
        { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: accessTtl },
      ),
      this.jwt.signAsync(
        { sub: user.id, jti: tokenId, type: 'refresh' },
        { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: refreshTtl },
      ),
    ]);
    const decoded = this.jwt.decode<RefreshPayload>(refreshToken);
    await this.refreshTokens.save(
      this.refreshTokens.create({
        tokenId,
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
        revokedAt: null,
      }),
    );
    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(token: string): Promise<RefreshPayload> {
    return this.jwt.verifyAsync<RefreshPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }
}
