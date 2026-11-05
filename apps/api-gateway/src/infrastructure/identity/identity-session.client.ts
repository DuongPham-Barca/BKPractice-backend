import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type SessionState = 'active' | 'inactive' | 'unavailable';

@Injectable()
export class IdentitySessionClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async checkSession(accessToken: string): Promise<SessionState> {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.config.getOrThrow<string>('IDENTITY_SERVICE_URL')}/internal/auth/session`,
          {
            headers: { authorization: `Bearer ${accessToken}` },
            timeout: 3000,
            validateStatus: () => true,
          },
        ),
      );
      if (response.status === 204) return 'active';
      if (response.status === 401) return 'inactive';
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
}
