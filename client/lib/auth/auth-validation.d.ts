export interface FormErrorItem {
  fieldId: string;
  fieldName: string;
  message: string;
}

export interface FormBannerState {
  tone: "error" | "warning" | "success" | "info";
  title?: string;
  message: string;
  code?: string;
  requestId?: string;
}

export function validateDisplayName(raw: string): string | undefined;
export function validateEmailAddress(raw: string): string | undefined;
export function validateLoginPassphrase(raw: string): string | undefined;
export function validateNewPassphrase(raw: string): string | undefined;
export function validateConfirmPassphrase(
  passphrase: string,
  confirmation: string,
): string | undefined;

export function buildFormErrorSummary(
  entries: Array<{ fieldId: string; fieldName: string; message?: string }>,
): FormErrorItem[];

export function buildLoginHref(options?: {
  verified?: boolean;
  reset?: boolean;
  reason?: "session-expired" | "signed-out";
  email?: string;
  next?: string | null;
}): string;

export function buildVerifyEmailHref(options?: {
  email?: string;
  sent?: boolean;
}): string;

export function buildForgotPasswordHref(options?: {
  email?: string;
}): string;
