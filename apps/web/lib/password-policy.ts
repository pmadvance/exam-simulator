export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENT_MESSAGE =
  "Use at least 8 characters with both letters and numbers.";

export function isValidPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && /[A-Za-z]/.test(password) && /\d/.test(password);
}
