import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(3, 'Email is required.')
  .max(254, 'Email must not exceed 254 characters.')
  .email('Enter a valid email address.');

export const passphraseSchema = z
  .string()
  .refine(
    (value) => Array.from(value).length >= 12,
    'Passphrase must be at least 12 characters.',
  )
  .refine(
    (value) => Array.from(value).length <= 128,
    'Passphrase must not exceed 128 characters.',
  )
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 512,
    'Passphrase exceeds maximum byte length.',
  );

export const RegisterRequestSchema = z
  .object({
    email: emailSchema,
    password: passphraseSchema,
    displayName: z
      .string()
      .trim()
      .min(2, 'Display name must be at least 2 characters.')
      .max(120, 'Display name must not exceed 120 characters.'),
  })
  .strict();

export type RegisterRequestDto = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(1, 'Passphrase is required.')
      .max(256, 'Passphrase is too long.'),
  })
  .strict();

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const SessionIdParamSchema = z
  .object({
    sessionId: z.string().uuid('Invalid session ID format.'),
  })
  .strict();

export type SessionIdParamDto = z.infer<typeof SessionIdParamSchema>;

export const EmailOnlyRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export type EmailOnlyRequestDto = z.infer<typeof EmailOnlyRequestSchema>;

export const TokenConfirmRequestSchema = z
  .object({
    token: z.string().trim().min(16, 'Invalid token format.').max(256),
  })
  .strict();

export type TokenConfirmRequestDto = z.infer<typeof TokenConfirmRequestSchema>;

export const ResetPasswordConfirmRequestSchema = z
  .object({
    token: z.string().trim().min(16, 'Invalid token format.').max(256),
    newPassword: passphraseSchema,
  })
  .strict();

export type ResetPasswordConfirmRequestDto = z.infer<
  typeof ResetPasswordConfirmRequestSchema
>;
