import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENT_MESSAGE =
  "Use at least 8 characters with both letters and numbers.";

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENT_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_REQUIREMENT_MESSAGE)
  .regex(/\d/, PASSWORD_REQUIREMENT_MESSAGE);

export function isValidPassword(password: string) {
  return passwordSchema.safeParse(password).success;
}
