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

export function answerSelectionCount(value: string | null | undefined) {
  const normalized = normalizeAnswer(value);
  return normalized ? normalized.split(",").length : 0;
}

export function requiredAnswerSelectionCount(
  questionType: "single_choice" | "multiple_response" | "true_false" | string | null | undefined,
  correctAnswer: string | null | undefined,
) {
  return questionType === "multiple_response"
    ? Math.max(1, answerSelectionCount(correctAnswer))
    : 1;
}
