import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

import { GatewaySessionVerifier } from './gateway-session-verifier';

describe('GatewaySessionVerifier', () => {
  const get = jest.fn();
  const verifier = new GatewaySessionVerifier(
    { get } as unknown as HttpService,
    new ConfigService({ IDENTITY_SERVICE_URL: 'http://identity:3001' }),
  );

  it('accepts only a live session and fails closed on Identity errors', async () => {
    get.mockReturnValueOnce(of({ status: 204 }));
    await expect(verifier.isActive('access')).resolves.toBe(true);
    expect(get).toHaveBeenCalledWith('http://identity:3001/internal/auth/session',
      expect.objectContaining({ headers: { authorization: 'Bearer access' } }));
    get.mockReturnValueOnce(of({ status: 401 }));
    await expect(verifier.isActive('access')).resolves.toBe(false);
    get.mockReturnValueOnce(throwError(() => new Error('offline')));
    await expect(verifier.isActive('access')).rejects.toThrow('Session verification is unavailable');
  });
});
