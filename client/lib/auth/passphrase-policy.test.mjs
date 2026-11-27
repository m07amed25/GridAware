import assert from "node:assert/strict";
import test from "node:test";
import {
  assessPassphrase,
  assessPassphraseMatch,
} from "./passphrase-policy.mjs";

test("assessPassphrase handles empty and below-minimum inputs", () => {
  const empty = assessPassphrase("");
  assert.equal(empty.length, 0);
  assert.equal(empty.isPolicyValid, false);
  assert.equal(empty.strengthTier, "empty");
  assert.equal(empty.strengthScore, 0);

  const short = assessPassphrase("short-pass");
  assert.equal(short.length, 10);
  assert.equal(short.minLengthMet, false);
  assert.equal(short.isPolicyValid, false);
  assert.equal(short.strengthTier, "too-short");
  assert.equal(short.strengthScore, 20);
});

test("assessPassphrase counts Unicode codepoints accurately across 12..128 bounds", () => {
  const elevenEmojis = assessPassphrase("⚡".repeat(11));
  assert.equal(elevenEmojis.length, 11);
  assert.equal(elevenEmojis.isPolicyValid, false);

  const twelveEmojis = assessPassphrase("⚡".repeat(12));
  assert.equal(twelveEmojis.length, 12);
  assert.equal(twelveEmojis.minLengthMet, true);
  assert.equal(twelveEmojis.maxLengthMet, true);
  assert.equal(twelveEmojis.isPolicyValid, true);

  const exactMax = assessPassphrase("a".repeat(128));
  assert.equal(exactMax.length, 128);
  assert.equal(exactMax.isPolicyValid, true);

  const overMax = assessPassphrase("a".repeat(129));
  assert.equal(overMax.length, 129);
  assert.equal(overMax.maxLengthMet, false);
  assert.equal(overMax.isPolicyValid, false);
});

test("assessPassphrase grades fair, strong, and very-strong tiers without rejecting valid passphrases", () => {
  const fair = assessPassphrase("abcdefghijkl");
  assert.equal(fair.isPolicyValid, true);
  assert.equal(fair.strengthTier, "fair");
  assert.equal(fair.strengthScore, 50);

  const strong = assessPassphrase("Generator42!Ok");
  assert.equal(strong.isPolicyValid, true);
  assert.equal(strong.strengthTier, "strong");
  assert.equal(strong.strengthScore, 75);

  const veryStrong = assessPassphrase("north turbine coolant stable");
  assert.equal(veryStrong.isPolicyValid, true);
  assert.equal(veryStrong.strengthTier, "very-strong");
  assert.equal(veryStrong.strengthScore, 100);
});

test("assessPassphraseMatch returns empty, matching, and mismatch accurately", () => {
  assert.equal(assessPassphraseMatch("north turbine coolant", ""), "empty");
  assert.equal(
    assessPassphraseMatch("north turbine coolant", "north turbine coolant"),
    "matching",
  );
  assert.equal(
    assessPassphraseMatch("north turbine coolant", "north turbine"),
    "mismatch",
  );
});
