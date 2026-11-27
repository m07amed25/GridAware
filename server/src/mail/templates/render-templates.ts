import { render } from '@react-email/render';
import { createElement } from 'react';
import type {
  PasswordResetEmailPayload,
  VerificationEmailPayload,
} from '../mailer.port.js';
import { PasswordResetTemplate } from './password-reset.template.js';
import { VerifyEmailTemplate } from './verify-email.template.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export async function renderVerificationEmail(
  payload: VerificationEmailPayload,
): Promise<RenderedEmail> {
  const element = createElement(VerifyEmailTemplate, {
    displayName: payload.displayName,
    verificationUrl: payload.verificationUrl,
    expiresInHours: payload.expiresInHours,
  });
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return {
    subject: 'Verify your GridAware account email',
    html,
    text,
  };
}

export async function renderPasswordResetEmail(
  payload: PasswordResetEmailPayload,
): Promise<RenderedEmail> {
  const element = createElement(PasswordResetTemplate, {
    displayName: payload.displayName,
    resetUrl: payload.resetUrl,
    expiresInMinutes: payload.expiresInMinutes,
  });
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return {
    subject: 'Reset your GridAware passphrase',
    html,
    text,
  };
}
