import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

import { IdentitySessionClient } from './identity-session.client';

describe('IdentitySessionClient', () => {
  const get = jest.fn();
  const client = new IdentitySessionClient(
    { get } as unknown as HttpService,
    new ConfigService({ IDENTITY_SERVICE_URL: 'http://identity:3001' }),
  );

  it('reports active, inactive and unavailable session states', async () => {
    get.mockReturnValueOnce(of({ status: 204 }));
    await expect(client.checkSession('access')).resolves.toBe('active');
    expect(get).toHaveBeenCalledWith(
      'http://identity:3001/internal/auth/session',
      expect.objectContaining({ headers: { authorization: 'Bearer access' } }),
    );
    get.mockReturnValueOnce(of({ status: 401 }));
    await expect(client.checkSession('access')).resolves.toBe('inactive');
    get.mockReturnValueOnce(throwError(() => new Error('offline')));
    await expect(client.checkSession('access')).resolves.toBe('unavailable');
  });
});
