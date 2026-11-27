export type PassphraseStrengthTier =
  | "empty"
  | "too-short"
  | "fair"
  | "strong"
  | "very-strong";

export interface PassphraseAssessment {
  length: number;
  minLengthMet: boolean;
  maxLengthMet: boolean;
  isPolicyValid: boolean;
  strengthTier: PassphraseStrengthTier;
  strengthLabel: string;
  strengthScore: 0 | 20 | 50 | 75 | 100;
  guidance: string;
}

export type PassphraseMatchState = "empty" | "matching" | "mismatch";

export const MIN_PASSPHRASE_LENGTH: number;
export const MAX_PASSPHRASE_LENGTH: number;

export function assessPassphrase(raw: string): PassphraseAssessment;
export function assessPassphraseMatch(
  passphrase: string,
  confirmation: string,
): PassphraseMatchState;
