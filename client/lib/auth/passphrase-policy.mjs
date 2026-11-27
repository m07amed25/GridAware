export const MIN_PASSPHRASE_LENGTH = 12;
export const MAX_PASSPHRASE_LENGTH = 128;

function countCharacterClasses(value) {
  let classes = 0;
  if (/[a-z]/.test(value)) classes += 1;
  if (/[A-Z]/.test(value)) classes += 1;
  if (/[0-9]/.test(value)) classes += 1;
  if (/[^a-zA-Z0-9\s]/.test(value)) classes += 1;
  if (/\s/.test(value)) classes += 1;
  return classes;
}

function hasMultipleWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length >= 3;
}

/**
 * Evaluates passphrase policy compliance (12..128 Unicode codepoints) and
 * computes advisory strength feedback that never contradicts the policy.
 * @param {string} raw
 */
export function assessPassphrase(raw) {
  const value = typeof raw === "string" ? raw : "";
  const length = Array.from(value).length;
  const minLengthMet = length >= MIN_PASSPHRASE_LENGTH;
  const maxLengthMet = length <= MAX_PASSPHRASE_LENGTH;

  if (length === 0) {
    return {
      length: 0,
      minLengthMet: false,
      maxLengthMet: true,
      isPolicyValid: false,
      strengthTier: "empty",
      strengthLabel: "",
      strengthScore: 0,
      guidance:
        "Use 12 to 128 characters. Multi-word passphrases and password managers are encouraged.",
    };
  }

  if (!maxLengthMet) {
    return {
      length,
      minLengthMet: true,
      maxLengthMet: false,
      isPolicyValid: false,
      strengthTier: "too-short",
      strengthLabel: "Too long",
      strengthScore: 20,
      guidance: `Shorten by ${length - MAX_PASSPHRASE_LENGTH} characters to stay within the 128-character limit.`,
    };
  }

  if (!minLengthMet) {
    const remaining = MIN_PASSPHRASE_LENGTH - length;
    return {
      length,
      minLengthMet: false,
      maxLengthMet: true,
      isPolicyValid: false,
      strengthTier: "too-short",
      strengthLabel: "Too short",
      strengthScore: 20,
      guidance: `Add ${remaining} more ${remaining === 1 ? "character" : "characters"} to meet the 12-character minimum.`,
    };
  }

  const classes = countCharacterClasses(value);
  const multiWord = hasMultipleWords(value);

  if (length >= 20 || (length >= 16 && (classes >= 3 || multiWord))) {
    return {
      length,
      minLengthMet: true,
      maxLengthMet: true,
      isPolicyValid: true,
      strengthTier: "very-strong",
      strengthLabel: "Very strong",
      strengthScore: 100,
      guidance: "Long passphrase meets GridAware policy with high entropy.",
    };
  }

  if (length >= 16 || classes >= 3 || multiWord) {
    return {
      length,
      minLengthMet: true,
      maxLengthMet: true,
      isPolicyValid: true,
      strengthTier: "strong",
      strengthLabel: "Strong",
      strengthScore: 75,
      guidance: "Meets policy. Adding another word increases resilience further.",
    };
  }

  return {
    length,
    minLengthMet: true,
    maxLengthMet: true,
    isPolicyValid: true,
    strengthTier: "fair",
    strengthLabel: "Fair",
    strengthScore: 50,
    guidance: "Meets policy. Consider 16+ characters or multiple words.",
  };
}

/**
 * Evaluates confirmation passphrase match state.
 * @param {string} passphrase
 * @param {string} confirmation
 */
export function assessPassphraseMatch(passphrase, confirmation) {
  if (!confirmation) {
    return "empty";
  }
  return passphrase === confirmation ? "matching" : "mismatch";
}
