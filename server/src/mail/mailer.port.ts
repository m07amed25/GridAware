export const MAILER_PORT = Symbol('MAILER_PORT');

export interface VerificationEmailPayload {
  to: string;
  displayName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export interface PasswordResetEmailPayload {
  to: string;
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface MailerPort {
  sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
  sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void>;
}
