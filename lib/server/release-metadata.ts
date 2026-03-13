export type ReviewSentiment = "positive" | "mixed" | "negative";
export type ReviewConfidence = "low" | "medium" | "high";

export interface ReleaseEditorialReviewSummary {
  summaryNote: string | null;
  pinnedTakeaways: string[];
  ignoredThemes: string[];
}

export interface ReleaseAiReviewSummary {
  overview: string;
  overallSentiment: ReviewSentiment;
  confidence: ReviewConfidence;
  pros: string[];
  cons: string[];
  bestFor: string[];
  watchOuts: string[];
  reviewCount: number;
  sourceCount: number;
  generatedAt: string;
  model: string | null;
  provider: "openai" | "heuristic";
}

type ReleaseMetadataRecord = Record<string, unknown>;

export function mergeReleaseMetadata(
  metadata: unknown,
  patch: Partial<{
    editorialReviewSummary: ReleaseEditorialReviewSummary;
    aiReviewSummary: ReleaseAiReviewSummary;
  }>,
) {
  const base = asRecord(metadata);
  const next: ReleaseMetadataRecord = { ...base };

  if (patch.editorialReviewSummary) {
    next.editorialReviewSummary = {
      ...getReleaseReconciliationOverrides(base),
      ...patch.editorialReviewSummary,
    };
  }

  if (patch.aiReviewSummary) {
    next.aiReviewSummary = patch.aiReviewSummary;
  }

  return next;
}

export function getReleaseReconciliationOverrides(metadata: unknown): ReleaseEditorialReviewSummary {
  const summary = asRecord(metadata).editorialReviewSummary;
  const record = asRecord(summary);

  return {
    summaryNote: typeof record.summaryNote === "string" ? record.summaryNote : null,
    pinnedTakeaways: readStringList(record.pinnedTakeaways, 5),
    ignoredThemes: readStringList(record.ignoredThemes, 8),
  };
}

export function getReleaseAiReviewSummary(metadata: unknown): ReleaseAiReviewSummary | null {
  const record = asRecord(asRecord(metadata).aiReviewSummary);
  const overview = typeof record.overview === "string" ? record.overview.trim() : "";
  const overallSentiment = readSentiment(record.overallSentiment);
  const confidence = readConfidence(record.confidence);
  const generatedAt = typeof record.generatedAt === "string" ? record.generatedAt : null;
  const provider = record.provider === "openai" || record.provider === "heuristic"
    ? record.provider
    : null;

  if (!overview || !overallSentiment || !confidence || !generatedAt || !provider) {
    return null;
  }

  return {
    overview,
    overallSentiment,
    confidence,
    pros: readStringList(record.pros, 4),
    cons: readStringList(record.cons, 4),
    bestFor: readStringList(record.bestFor, 4),
    watchOuts: readStringList(record.watchOuts, 4),
    reviewCount: typeof record.reviewCount === "number" ? record.reviewCount : 0,
    sourceCount: typeof record.sourceCount === "number" ? record.sourceCount : 0,
    generatedAt,
    model: typeof record.model === "string" ? record.model : null,
    provider,
  };
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as ReleaseMetadataRecord;
  }

  return value as ReleaseMetadataRecord;
}

function readStringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit);
}

function readSentiment(value: unknown): ReviewSentiment | null {
  if (value === "positive" || value === "mixed" || value === "negative") {
    return value;
  }

  return null;
}

function readConfidence(value: unknown): ReviewConfidence | null {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return null;
}
