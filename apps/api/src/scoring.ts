export function normalizeAnswer(value: string | null | undefined) {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function answersMatch(selected: string | null | undefined, correct: string | null | undefined) {
  return normalizeAnswer(selected) === normalizeAnswer(correct);
}
