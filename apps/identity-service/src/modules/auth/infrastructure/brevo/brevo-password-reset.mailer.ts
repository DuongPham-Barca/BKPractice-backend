import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PasswordResetMailDeliveryFailure } from '@/modules/auth/application/ports';
import type { PasswordResetMailer } from '@/modules/auth/application/ports';

@Injectable()
export class BrevoPasswordResetMailer implements PasswordResetMailer {
  private readonly logger = new Logger(BrevoPasswordResetMailer.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(email: string, otp: string): Promise<void> {
    let status: number | undefined;
    let phase = 'configuration';
    try {
      const apiKey = this.config.get<string>('BREVO_API_KEY');
      const sender = this.config.get<string>('BREVO_SENDER_EMAIL');
      if (!apiKey || !sender) throw new Error('Brevo configuration missing');

      phase = 'request';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: sender,
            name: this.config.get<string>('BREVO_SENDER_NAME') ?? 'BKPractice',
          },
          to: [{ email }],
          subject: 'BKPractice - mã đặt lại mật khẩu',
          textContent: `Mã xác minh BKPractice của bạn là ${otp}. Mã có hiệu lực trong 5 phút.`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      status = response.status;
      if (status !== 201) throw new Error('Brevo rejected email');
    } catch {
      this.logger.warn(
        `Password reset email delivery failed (${status === undefined ? phase : `Brevo HTTP ${status}`})`,
      );
      throw new PasswordResetMailDeliveryFailure();
    }
  }
}
