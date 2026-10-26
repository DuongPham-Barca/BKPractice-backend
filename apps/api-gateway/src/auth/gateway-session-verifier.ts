import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewaySessionVerifier {
  constructor(private readonly http: HttpService, private readonly config: ConfigService) {}

  async isActive(accessToken: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.get(
        `${this.config.getOrThrow<string>('IDENTITY_SERVICE_URL')}/internal/auth/session`,
        { headers: { authorization: `Bearer ${accessToken}` }, timeout: 3000, validateStatus: () => true },
      ));
      if (response.status === 204) return true;
      if (response.status === 401) return false;
      throw new ServiceUnavailableException('Session verification is unavailable');
    } catch {
      throw new ServiceUnavailableException('Session verification is unavailable');
    }
  }
}
