import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PasswordResetMailDeliveryFailure } from '@/modules/auth/application/ports';
import { BrevoPasswordResetMailer } from '@/modules/auth/infrastructure/brevo';

describe('BrevoPasswordResetMailer', () => {
  const originalFetch = global.fetch;
  const config = new ConfigService({
    BREVO_API_KEY: 'test-api-key',
    BREVO_SENDER_EMAIL: 'verified@example.com',
    BREVO_SENDER_NAME: 'BKPractice Support',
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends the OTP to the stored recipient through Brevo', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 201 }) as typeof fetch;
    await new BrevoPasswordResetMailer(config).sendOtp('student@school.edu', '123456');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({ 'api-key': 'test-api-key' });
    expect(JSON.parse(options.body as string)).toMatchObject({
      sender: { email: 'verified@example.com', name: 'BKPractice Support' },
      to: [{ email: 'student@school.edu' }],
      textContent: expect.stringContaining('123456') as string,
    });
  });

  it('maps Brevo failures to a safe delivery error and warning', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 403 }) as typeof fetch;
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await expect(new BrevoPasswordResetMailer(config).sendOtp('student@school.edu', '123456'))
      .rejects.toBeInstanceOf(PasswordResetMailDeliveryFailure);
    expect(warn).toHaveBeenCalledWith('Password reset email delivery failed (Brevo HTTP 403)');
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/student@school\.edu|123456|test-api-key/);
  });

  it('maps missing configuration and network errors to the same safe failure', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await expect(new BrevoPasswordResetMailer(new ConfigService({})).sendOtp('student@school.edu', '123456'))
      .rejects.toBeInstanceOf(PasswordResetMailDeliveryFailure);
    global.fetch = jest.fn().mockRejectedValue(new Error('student@school.edu 123456 test-api-key')) as typeof fetch;
    await expect(new BrevoPasswordResetMailer(config).sendOtp('student@school.edu', '123456'))
      .rejects.toBeInstanceOf(PasswordResetMailDeliveryFailure);
    expect(warn).toHaveBeenNthCalledWith(1, 'Password reset email delivery failed (configuration)');
    expect(warn).toHaveBeenNthCalledWith(2, 'Password reset email delivery failed (request)');
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/student@school\.edu|123456|test-api-key/);
  });
});
