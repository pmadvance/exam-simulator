import assert from "node:assert/strict";
import test from "node:test";

import { calculateReadiness, classifyEcoDomain, normalizeDeliveryApproach, type AnalyticsAttempt, type AnalyticsQuestion } from "../src/analytics/readiness.js";

test("normalizes official ECO task codes and delivery-approach labels", () => {
  assert.equal(classifyEcoDomain("pmp-exam-simulator", "II.7")?.name, "Process");
  assert.equal(classifyEcoDomain("pmp-exam-simulator", "3.2")?.name, "Business Environment");
  assert.equal(classifyEcoDomain("capm", "IV.1")?.name, "Business Analysis Frameworks");
  assert.equal(normalizeDeliveryApproach("Adaptive"), "Adaptive/Agile");
  assert.equal(normalizeDeliveryApproach("not classified"), null);
});

test("fresh-question accuracy is not inflated by repeated answers", () => {
  const questions: AnalyticsQuestion[] = [{
    id: "1", examId: 1, productSlug: "pmp", correctAnswer: "A", rawEcoValue: "I.1", rawDeliveryApproach: "Agile",
  }];
  const base = {
    examId: 1,
    examType: "section" as const,
    scorePercent: 50,
    totalQuestions: 1,
    timeLimitMinutes: 1,
    questionTimings: { "1": 30 },
    questionOrder: ["1"],
    questionSnapshots: {},
  };
  const attempts: AnalyticsAttempt[] = [
    { ...base, id: "a", answers: { "1": "B" }, startedAt: new Date("2026-01-01T00:00:00Z"), submittedAt: new Date("2026-01-01T00:01:00Z") },
    { ...base, id: "b", answers: { "1": "A" }, startedAt: new Date("2026-01-02T00:00:00Z"), submittedAt: new Date("2026-01-02T00:01:00Z") },
  ];

  const result = calculateReadiness("pmp", attempts, questions).readiness;
  assert.equal(result.firstSeenQuestionCount, 1);
  assert.equal(result.firstSeenAccuracy, 0);
  assert.equal(result.repeatRate, 50);
  assert.equal(result.score, null);
});

test("unlocks readiness only with broad, blueprint-balanced full-simulation evidence", () => {
  const questions: AnalyticsQuestion[] = Array.from({ length: 120 }, (_, index) => ({
    id: String(index + 1),
    examId: index < 60 ? 1 : 2,
    productSlug: "pmp",
    correctAnswer: "A",
    rawEcoValue: index % 3 === 0 ? "I.1" : index % 3 === 1 ? "II.2" : "III.1",
    rawDeliveryApproach: index % 2 ? "Predictive" : "Hybrid",
  }));
  const makeAttempt = (id: string, examId: number, ids: string[], correctThrough: number): AnalyticsAttempt => ({
    id,
    examId,
    examType: "full_simulation",
    scorePercent: Math.round(correctThrough / ids.length * 100),
    totalQuestions: ids.length,
    timeLimitMinutes: 80,
    answers: Object.fromEntries(ids.map((questionId, index) => [questionId, index < correctThrough ? "A" : "B"])),
    questionTimings: Object.fromEntries(ids.map((questionId) => [questionId, 60])),
    questionOrder: ids,
    questionSnapshots: {},
    startedAt: new Date(`2026-02-0${examId}T00:00:00Z`),
    submittedAt: new Date(`2026-02-0${examId}T01:00:00Z`),
  });
  const firstIds = questions.slice(0, 60).map((q) => q.id);
  const secondIds = questions.slice(60).map((q) => q.id);
  const result = calculateReadiness("pmp", [makeAttempt("one", 1, firstIds, 48), makeAttempt("two", 2, secondIds, 42)], questions).readiness;

  assert.equal(result.eligible, true);
  assert.notEqual(result.score, null);
  assert.equal(result.coveragePercent, 100);
  assert.equal(result.blueprintCoverage, 100);
  assert.equal(result.distinctFullSimulationCount, 2);
  assert.equal(result.averageSecondsPerQuestion, 60);
  assert.equal(result.paceStatus, "on_track");
  assert.equal(result.staminaEvidenceCount, 120);
});

test("keeps historical mastery stable when a snapshotted question leaves the live bank", () => {
  const snapshot: AnalyticsQuestion = {
    id: "retired", examId: 9, productSlug: "pmp", correctAnswer: "C", rawEcoValue: "III.2", rawDeliveryApproach: "Hybrid",
  };
  const attempt: AnalyticsAttempt = {
    id: "historical", examId: 9, examType: "section", scorePercent: 100, totalQuestions: 1,
    timeLimitMinutes: 2, answers: { retired: "C" }, questionTimings: { retired: 45 },
    questionOrder: ["retired"], questionSnapshots: { retired: snapshot },
    startedAt: new Date("2026-03-01T00:00:00Z"), submittedAt: new Date("2026-03-01T00:01:00Z"),
  };

  const result = calculateReadiness("pmp", [attempt], []);
  assert.equal(result.readiness.firstSeenAccuracy, 100);
  assert.equal(result.ecoDomains[0]?.domain, "Business Environment");
  assert.equal(result.readiness.coveragePercent, 0);
});
