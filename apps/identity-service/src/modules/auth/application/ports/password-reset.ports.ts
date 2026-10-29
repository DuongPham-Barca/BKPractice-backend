import type { ResetAccount } from '@/modules/auth/domain';

export interface PasswordResetAccountRepository {
  findByEmail(email: string): Promise<ResetAccount | null>;
  resetPasswordWithGrant(resetToken: string, newPassword: string): Promise<boolean>;
}

export interface PasswordResetStore {
  assertAvailable(): Promise<void>;
  issueOtp(userId: string, email: string, otp: string): Promise<boolean>;
  verifyOtp(userId: string, email: string, otp: string, resetToken: string): Promise<string | null>;
}

export interface PasswordResetMailer {
  sendOtp(email: string, otp: string): Promise<void>;
}

export class PasswordResetMailDeliveryFailure extends Error {
  constructor() {
    super('Password reset email delivery failed');
  }
}
