import { answersMatch } from "../scoring.js";

export type AnalyticsAttempt = {
  id: string;
  examId: number;
  examType: "quiz" | "section" | "full_simulation";
  scorePercent: number;
  totalQuestions: number;
  timeLimitMinutes: number;
  answers: Record<string, string>;
  questionTimings: Record<string, number>;
  questionOrder: string[];
  questionSnapshots: Record<string, AnalyticsQuestion>;
  startedAt: Date;
  submittedAt: Date;
};

export type AnalyticsQuestion = {
  id: string;
  examId: number;
  productSlug: string;
  correctAnswer: string;
  rawEcoValue: string | null;
  rawDeliveryApproach: string | null;
};

export type DomainEvidence = {
  domain: string;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  confidence: "insufficient" | "developing" | "established";
  blueprintWeight?: number;
};

const PMP_DOMAINS: Record<string, { name: string; weight: number }> = {
  "1": { name: "People", weight: 33 },
  "2": { name: "Process", weight: 41 },
  "3": { name: "Business Environment", weight: 26 },
};

const CAPM_DOMAINS: Record<string, { name: string; weight: number }> = {
  "1": { name: "Project Management Fundamentals and Core Concepts", weight: 36 },
  "2": { name: "Predictive, Plan-Based Methodologies", weight: 17 },
  "3": { name: "Agile Frameworks/Methodologies", weight: 20 },
  "4": { name: "Business Analysis Frameworks", weight: 27 },
};

function prefixFromEco(value: string) {
  const normalized = value.trim().toUpperCase();
  const numeric = normalized.match(/^(\d+)/)?.[1];
  if (numeric) return numeric;
  const roman = normalized.match(/^(IV|III|II|I)(?:\.|\b)/)?.[1];
  return roman ? String({ I: 1, II: 2, III: 3, IV: 4 }[roman]) : null;
}

export function classifyEcoDomain(productSlug: string, rawValue: string | null) {
  if (!rawValue?.trim()) return null;
  const direct = rawValue.trim().toLowerCase();
  const isCapm = productSlug.toLowerCase().includes("capm");
  const domains = isCapm ? CAPM_DOMAINS : PMP_DOMAINS;
  const directMatch = Object.values(domains).find((domain) => domain.name.toLowerCase() === direct);
  if (directMatch) return { ...directMatch, taskCode: null, blueprintVersion: isCapm ? "CAPM-2023" : "PMP-2026" };
  const prefix = prefixFromEco(rawValue);
  const domain = prefix ? domains[prefix] : undefined;
  return domain ? { ...domain, taskCode: rawValue.trim(), blueprintVersion: isCapm ? "CAPM-2023" : "PMP-2026" } : null;
}

export function normalizeDeliveryApproach(rawValue: string | null) {
  const value = rawValue?.trim().toLowerCase();
  if (!value) return null;
  if (["agile", "adaptive", "agile/adaptive", "adaptive/agile"].includes(value)) return "Adaptive/Agile";
  if (value === "predictive") return "Predictive";
  if (value === "hybrid") return "Hybrid";
  if (value === "agnostic") return "Agnostic";
  return null;
}

function confidenceForSample(total: number): DomainEvidence["confidence"] {
  if (total < 15) return "insufficient";
  if (total < 30) return "developing";
  return "established";
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateReadiness(productSlug: string, attempts: AnalyticsAttempt[], questions: AnalyticsQuestion[]) {
  const orderedAttempts = [...attempts].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const historicalQuestionMap = new Map<string, AnalyticsQuestion>();
  for (const attempt of attempts) {
    for (const [questionId, question] of Object.entries(attempt.questionSnapshots)) historicalQuestionMap.set(questionId, question);
  }
  const seen = new Set<string>();
  const uniqueAnswered = new Set<string>();
  const incorrectCounts = new Map<string, number>();
  const ecoStats = new Map<string, { total: number; correct: number; weight: number }>();
  const deliveryStats = new Map<string, { total: number; correct: number }>();
  let firstSeenTotal = 0;
  let firstSeenCorrect = 0;
  let responseCount = 0;
  let expectedResponses = 0;

  for (const attempt of orderedAttempts) {
    expectedResponses += attempt.totalQuestions;
    for (const [questionId, answer] of Object.entries(attempt.answers)) {
      const question = questionMap.get(questionId) ?? attempt.questionSnapshots[questionId];
      if (!question) continue;
      responseCount += 1;
      if (questionMap.has(questionId)) uniqueAnswered.add(questionId);
      const correct = answersMatch(answer, question.correctAnswer);
      if (!correct) incorrectCounts.set(questionId, (incorrectCounts.get(questionId) ?? 0) + 1);
      if (seen.has(questionId)) continue;
      seen.add(questionId);
      firstSeenTotal += 1;
      if (correct) firstSeenCorrect += 1;

      const eco = classifyEcoDomain(question.productSlug, question.rawEcoValue);
      if (eco) {
        const stat = ecoStats.get(eco.name) ?? { total: 0, correct: 0, weight: eco.weight };
        stat.total += 1;
        if (correct) stat.correct += 1;
        ecoStats.set(eco.name, stat);
      }
      const delivery = normalizeDeliveryApproach(question.rawDeliveryApproach);
      if (delivery) {
        const stat = deliveryStats.get(delivery) ?? { total: 0, correct: 0 };
        stat.total += 1;
        if (correct) stat.correct += 1;
        deliveryStats.set(delivery, stat);
      }
    }
  }

  const toEvidence = (entries: Iterable<[string, { total: number; correct: number; weight?: number }]>) => [...entries]
    .map(([domain, stat]) => ({
      domain,
      totalQuestions: stat.total,
      correctAnswers: stat.correct,
      averageScore: stat.total ? Math.round(stat.correct / stat.total * 100) : 0,
      confidence: confidenceForSample(stat.total),
      ...(stat.weight ? { blueprintWeight: stat.weight } : {}),
    }))
    .sort((a, b) => (b.blueprintWeight ?? b.totalQuestions) - (a.blueprintWeight ?? a.totalQuestions));

  const ecoDomains = toEvidence(ecoStats.entries());
  const deliveryApproaches = toEvidence(deliveryStats.entries());
  const classifiedQuestionCount = questions.filter((question) =>
    classifyEcoDomain(question.productSlug, question.rawEcoValue) && normalizeDeliveryApproach(question.rawDeliveryApproach)
  ).length;
  const classificationCoverage = questions.length ? Math.round(classifiedQuestionCount / questions.length * 100) : 0;
  const firstSeenAccuracy = firstSeenTotal ? Math.round(firstSeenCorrect / firstSeenTotal * 100) : 0;
  const smoothedFirstSeenAccuracy = Math.round((firstSeenCorrect + 5) / (firstSeenTotal + 10) * 100);
  const coveragePercent = questions.length ? Math.round(uniqueAnswered.size / questions.length * 100) : 0;
  const repeatRate = responseCount ? Math.round((responseCount - firstSeenTotal) / responseCount * 100) : 0;
  const unansweredRate = expectedResponses ? clamp(Math.round((expectedResponses - responseCount) / expectedResponses * 100)) : 0;
  const recurringMistakes = [...incorrectCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([questionId, count]) => {
      const question = questionMap.get(questionId) ?? historicalQuestionMap.get(questionId);
      return { questionId, count, ecoDomain: question ? classifyEcoDomain(question.productSlug, question.rawEcoValue)?.name ?? null : null };
    })
    .sort((a, b) => b.count - a.count);

  const fullSimulations = orderedAttempts.filter((attempt) => attempt.examType === "full_simulation");
  let timedSeconds = 0;
  let timedQuestions = 0;
  for (const attempt of fullSimulations) {
    for (const seconds of Object.values(attempt.questionTimings)) {
      if (seconds > 0) { timedSeconds += seconds; timedQuestions += 1; }
    }
  }
  const recent = fullSimulations.slice(-5);
  const weightTotal = recent.reduce((total, _attempt, index) => total + index + 1, 0);
  const recentAverage = weightTotal ? Math.round(recent.reduce((total, attempt, index) => total + attempt.scorePercent * (index + 1), 0) / weightTotal) : 0;
  const mean = recent.length ? recent.reduce((total, attempt) => total + attempt.scorePercent, 0) / recent.length : 0;
  const standardDeviation = recent.length ? Math.sqrt(recent.reduce((total, attempt) => total + (attempt.scorePercent - mean) ** 2, 0) / recent.length) : 0;
  const consistency = Math.round(clamp(100 - standardDeviation * 2));

  const blueprintEvidenceWeight = ecoDomains.reduce((total, domain) => total + (domain.blueprintWeight ?? 0), 0);
  const blueprintMastery = blueprintEvidenceWeight
    ? Math.round(ecoDomains.reduce((total, domain) => total + domain.averageScore * (domain.blueprintWeight ?? 0), 0) / blueprintEvidenceWeight)
    : 0;
  const blueprintCoverage = ecoDomains.reduce((total, domain) => total + (domain.totalQuestions >= 15 ? domain.blueprintWeight ?? 0 : 0), 0);

  const distinctFullSimulations = new Set(fullSimulations.map((attempt) => attempt.examId)).size;
  const enoughUniqueEvidence = firstSeenTotal >= Math.min(100, Math.ceil(questions.length * 0.6));
  const eligible = distinctFullSimulations >= 2 && fullSimulations.length >= 2 && coveragePercent >= 60 && blueprintCoverage >= 75 && classificationCoverage >= 90 && enoughUniqueEvidence;
  const score = eligible
    ? Math.round(recentAverage * 0.3 + smoothedFirstSeenAccuracy * 0.3 + blueprintMastery * 0.2 + consistency * 0.1 + coveragePercent * 0.1)
    : null;

  const averageDurationMinutes = fullSimulations.length
    ? Math.round(fullSimulations.reduce((total, attempt) => {
        const tracked = Object.values(attempt.questionTimings).reduce((sum, seconds) => sum + seconds, 0);
        return total + (tracked > 0 ? tracked * 1000 : Math.max(0, attempt.submittedAt.getTime() - attempt.startedAt.getTime()));
      }, 0) / fullSimulations.length / 60_000)
    : 0;
  const averageSecondsPerQuestion = timedQuestions ? Math.round(timedSeconds / timedQuestions) : null;
  const pacingTargets = fullSimulations.filter((attempt) => attempt.totalQuestions > 0).map((attempt) => attempt.timeLimitMinutes * 60 / attempt.totalQuestions);
  const targetSecondsPerQuestion = pacingTargets.length ? Math.round(pacingTargets.reduce((sum, value) => sum + value, 0) / pacingTargets.length) : null;
  const paceStatus = averageSecondsPerQuestion === null || targetSecondsPerQuestion === null
    ? "insufficient" as const
    : averageSecondsPerQuestion > targetSecondsPerQuestion * 1.1
      ? "behind" as const
      : averageSecondsPerQuestion < targetSecondsPerQuestion * 0.55
        ? "rushing" as const
        : "on_track" as const;

  const staminaTotals = [{ label: "Opening third", total: 0, correct: 0 }, { label: "Middle third", total: 0, correct: 0 }, { label: "Final third", total: 0, correct: 0 }];
  for (const attempt of fullSimulations) {
    const orderedIds = attempt.questionOrder.length ? attempt.questionOrder : Object.keys(attempt.answers);
    orderedIds.forEach((questionId, index) => {
      const question = questionMap.get(questionId) ?? attempt.questionSnapshots[questionId];
      const answer = attempt.answers[questionId];
      if (!question || !answer) return;
      const segment = Math.min(2, Math.floor(index / Math.max(1, orderedIds.length) * 3));
      staminaTotals[segment].total += 1;
      if (answersMatch(answer, question.correctAnswer)) staminaTotals[segment].correct += 1;
    });
  }
  const stamina = staminaTotals.map((segment) => ({
    label: segment.label,
    questionCount: segment.total,
    accuracy: segment.total ? Math.round(segment.correct / segment.total * 100) : null,
  }));
  const staminaEvidenceCount = staminaTotals.reduce((sum, segment) => sum + segment.total, 0);
  const staminaDrop = stamina[0].accuracy !== null && stamina[2].accuracy !== null ? stamina[0].accuracy - stamina[2].accuracy : null;
  const weakAreas = ecoDomains.filter((domain) => domain.totalQuestions >= 15 && domain.averageScore < 70).slice(0, 3).map((domain) => domain.domain);
  const recommendations = [
    ...(recurringMistakes.length ? [`Review ${recurringMistakes.length} recurring mistake${recurringMistakes.length === 1 ? "" : "s"}.`] : []),
    ...(weakAreas.length ? [`Focus next on ${weakAreas.join(", ")}.`] : []),
    ...(coveragePercent < 60 ? [`Increase unique-question coverage from ${coveragePercent}% to at least 60%.`] : []),
    ...(repeatRate > 35 ? [`Use fresh questions: ${repeatRate}% of your answered responses are repeats.`] : []),
    ...(distinctFullSimulations < 2 ? ["Complete two different full simulations to unlock a readiness score."] : []),
    ...(classificationCoverage < 90 ? [`Readiness remains locked while content classification coverage is ${classificationCoverage}%; an administrator must classify at least 90%.`] : []),
    ...(paceStatus === "behind" ? ["Build pacing: your observed time per question is slower than the allotted rate."] : []),
    ...(paceStatus === "rushing" ? ["Slow down enough to check assumptions: your observed pace suggests rushing."] : []),
    ...(staminaEvidenceCount >= 60 && staminaDrop !== null && staminaDrop >= 8 ? [`Practise exam stamina: final-third accuracy is ${staminaDrop} points below your opening third.`] : []),
  ];
  if (!recommendations.length) recommendations.push("Maintain your progress with a fresh, timed full simulation.");

  return {
    ecoDomains,
    deliveryApproaches,
    readiness: {
      score,
      eligible,
      confidence: eligible && fullSimulations.length >= 4 && coveragePercent >= 80 ? "high" as const : eligible ? "medium" as const : "low" as const,
      recentAverage,
      firstSeenAccuracy,
      smoothedFirstSeenAccuracy,
      firstSeenQuestionCount: firstSeenTotal,
      coveragePercent,
      consistency,
      blueprintMastery,
      blueprintCoverage,
      classificationCoverage,
      unansweredRate,
      repeatRate,
      recurringMistakes,
      weakAreas,
      recommendations,
      examAttemptCount: orderedAttempts.length,
      fullSimulationCount: fullSimulations.length,
      distinctFullSimulationCount: distinctFullSimulations,
      averageDurationMinutes,
      averageSecondsPerQuestion,
      targetSecondsPerQuestion,
      paceStatus,
      stamina,
      staminaEvidenceCount,
      formula: "30% recent score + 30% smoothed first-seen accuracy + 20% blueprint mastery + 10% consistency + 10% product coverage",
    },
  };
}
