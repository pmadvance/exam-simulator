import assert from "node:assert/strict";
import test from "node:test";

import { isValidPassword, passwordSchema, PASSWORD_REQUIREMENT_MESSAGE } from "../src/password-policy.js";
import { answerSelectionCount, answersMatch, normalizeAnswer, requiredAnswerSelectionCount } from "../src/scoring.js";
import { guestCheckoutSchema, registerSchema } from "../src/schemas.js";

test("one password policy is enforced by registration and checkout", () => {
  assert.equal(isValidPassword("letters-only"), false);
  assert.equal(isValidPassword("12345678"), false);
  assert.equal(isValidPassword("Pass1234"), true);
  assert.equal(passwordSchema.safeParse("short1").error?.issues[0]?.message, PASSWORD_REQUIREMENT_MESSAGE);

  const base = { email: "learner@example.com", fullName: "Test Learner", verificationCode: "123456", privacyAccepted: true as const };
  assert.equal(registerSchema.safeParse({ ...base, password: "letters-only" }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, password: "Pass1234" }).success, true);
  assert.equal(guestCheckoutSchema.safeParse({ ...base, productSlug: "pmp-pack", provider: "toyyibpay", password: "letters-only" }).success, false);
  assert.equal(guestCheckoutSchema.safeParse({ ...base, productSlug: "pmp-pack", provider: "toyyibpay", password: "Pass1234" }).success, true);
});

test("multiple-response scoring ignores option order and whitespace", () => {
  assert.equal(normalizeAnswer(" C, a ,B "), "A,B,C");
  assert.equal(answersMatch("C,A,B", "A,B,C"), true);
  assert.equal(answersMatch("A,B", "A,B,C"), false);
});

test("selection limits are derived from the configured answer key", () => {
  assert.equal(answerSelectionCount("A,C"), 2);
  assert.equal(answerSelectionCount(" C, A, E "), 3);
  assert.equal(requiredAnswerSelectionCount("multiple_response", "A,C"), 2);
  assert.equal(requiredAnswerSelectionCount("multiple_response", "A,C,E"), 3);
  assert.equal(requiredAnswerSelectionCount("single_choice", "A,C"), 1);
});
