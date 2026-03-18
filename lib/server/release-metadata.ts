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
  editorialSentiment: ReviewSentiment | null;
  communitySentiment: ReviewSentiment | null;
  sourceAlignment: "aligned" | "mixed" | "divergent";
  buyerSignal: string | null;
  pros: string[];
  cons: string[];
  bestFor: string[];
  watchOuts: string[];
  consensusPoints: string[];
  debates: string[];
  reviewCount: number;
  sourceCount: number;
  generatedAt: string;
  model: string | null;
  provider: "openai" | "heuristic";
  evidence: Array<{
    sourceName: string;
    sourceType: "editorial" | "reddit" | "user";
    title: string | null;
    excerpt: string;
  }>;
  isEditorialOverride: boolean;
}

export interface ReleaseAiReviewSummaryOverride {
  isEnabled: boolean;
  overview: string | null;
  overallSentiment: ReviewSentiment | null;
  confidence: ReviewConfidence | null;
  pros: string[];
  cons: string[];
  bestFor: string[];
  watchOuts: string[];
  updatedAt: string | null;
}

export interface ReleaseAiReviewSummaryHistoryEntry {
  timestamp: string;
  eventType: "generated" | "refreshed" | "cleared" | "override-enabled" | "override-disabled";
  provider: "openai" | "heuristic" | "editorial" | null;
  overview: string | null;
  overallSentiment: ReviewSentiment | null;
  confidence: ReviewConfidence | null;
  reviewCount: number;
  sourceCount: number;
  evidenceCount: number;
}

type ReleaseMetadataRecord = Record<string, unknown>;

export function mergeReleaseMetadata(
  metadata: unknown,
  patch: Partial<{
    editorialReviewSummary: ReleaseEditorialReviewSummary | null;
    aiReviewSummary: ReleaseAiReviewSummary | null;
    editorialAiReviewSummaryOverride: ReleaseAiReviewSummaryOverride | null;
  }>,
) {
  const base = asRecord(metadata);
  const next: ReleaseMetadataRecord = { ...base };

  if (patch.editorialReviewSummary === null) {
    delete next.editorialReviewSummary;
  } else if (patch.editorialReviewSummary) {
    next.editorialReviewSummary = {
      ...getReleaseReconciliationOverrides(base),
      ...patch.editorialReviewSummary,
    };
  }

  if (patch.aiReviewSummary === null) {
    delete next.aiReviewSummary;
  } else if (patch.aiReviewSummary) {
    next.aiReviewSummary = patch.aiReviewSummary;
  }

  if (patch.editorialAiReviewSummaryOverride === null) {
    delete next.editorialAiReviewSummaryOverride;
  } else if (patch.editorialAiReviewSummaryOverride) {
    next.editorialAiReviewSummaryOverride = patch.editorialAiReviewSummaryOverride;
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
  const generated = getStoredReleaseAiReviewSummary(metadata);
  const override = getReleaseAiReviewSummaryOverride(metadata);

  if (!generated) {
    return null;
  }

  if (!override?.isEnabled) {
    return generated;
  }

  return {
    ...generated,
    overview: override.overview ?? generated.overview,
    overallSentiment: override.overallSentiment ?? generated.overallSentiment,
    confidence: override.confidence ?? generated.confidence,
    editorialSentiment: generated.editorialSentiment,
    communitySentiment: generated.communitySentiment,
    sourceAlignment: generated.sourceAlignment,
    buyerSignal: generated.buyerSignal,
    pros: override.pros.length ? override.pros : generated.pros,
    cons: override.cons.length ? override.cons : generated.cons,
    bestFor: override.bestFor.length ? override.bestFor : generated.bestFor,
    watchOuts: override.watchOuts.length ? override.watchOuts : generated.watchOuts,
    consensusPoints: generated.consensusPoints,
    debates: generated.debates,
    isEditorialOverride: true,
  };
}

export function getStoredReleaseAiReviewSummary(metadata: unknown): ReleaseAiReviewSummary | null {
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
    editorialSentiment: readSentiment(record.editorialSentiment),
    communitySentiment: readSentiment(record.communitySentiment),
    sourceAlignment:
      record.sourceAlignment === "aligned" || record.sourceAlignment === "mixed" || record.sourceAlignment === "divergent"
        ? record.sourceAlignment
        : "mixed",
    buyerSignal: typeof record.buyerSignal === "string" ? record.buyerSignal : null,
    pros: readStringList(record.pros, 4),
    cons: readStringList(record.cons, 4),
    bestFor: readStringList(record.bestFor, 4),
    watchOuts: readStringList(record.watchOuts, 4),
    consensusPoints: readStringList(record.consensusPoints, 4),
    debates: readStringList(record.debates, 4),
    reviewCount: typeof record.reviewCount === "number" ? record.reviewCount : 0,
    sourceCount: typeof record.sourceCount === "number" ? record.sourceCount : 0,
    generatedAt,
    model: typeof record.model === "string" ? record.model : null,
    provider,
    evidence: readEvidenceList(record.evidence),
    isEditorialOverride: false,
  };
}

export function getReleaseAiReviewSummaryOverride(
  metadata: unknown,
): ReleaseAiReviewSummaryOverride | null {
  const record = asRecord(asRecord(metadata).editorialAiReviewSummaryOverride);
  const isEnabled = Boolean(record.isEnabled);
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : null;

  if (!isEnabled && !updatedAt) {
    return null;
  }

  return {
    isEnabled,
    overview: typeof record.overview === "string" ? record.overview : null,
    overallSentiment: readSentiment(record.overallSentiment),
    confidence: readConfidence(record.confidence),
    pros: readStringList(record.pros, 4),
    cons: readStringList(record.cons, 4),
    bestFor: readStringList(record.bestFor, 4),
    watchOuts: readStringList(record.watchOuts, 4),
    updatedAt,
  };
}

function readEvidenceList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const sourceName = typeof record.sourceName === "string" ? record.sourceName : null;
      const title = typeof record.title === "string" ? record.title : null;
      const excerpt = typeof record.excerpt === "string" ? record.excerpt.trim() : "";
      const sourceType =
        record.sourceType === "editorial" || record.sourceType === "reddit" || record.sourceType === "user"
          ? record.sourceType
          : null;

      if (!sourceName || !sourceType || !excerpt) {
        return null;
      }

      return {
        sourceName,
        sourceType,
        title,
        excerpt,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        sourceName: string;
        sourceType: "editorial" | "reddit" | "user";
        title: string | null;
        excerpt: string;
      } => Boolean(entry),
    )
    .slice(0, 6);
}

export function hasAnyAiReviewSummary(metadata: unknown) {
  return Boolean(getStoredReleaseAiReviewSummary(metadata) || getReleaseAiReviewSummaryOverride(metadata));
}

export function getAiReviewSummaryGeneratedAt(metadata: unknown) {
  return getStoredReleaseAiReviewSummary(metadata)?.generatedAt ?? null;
}

export function getAiReviewSummaryOverrideStatus(metadata: unknown) {
  return Boolean(getReleaseAiReviewSummaryOverride(metadata)?.isEnabled);
}

export function getAiReviewSummaryPreview(metadata: unknown) {
  return getReleaseAiReviewSummary(metadata)?.overview ?? null;
}

export function getAiReviewSummarySourceCount(metadata: unknown) {
  return getStoredReleaseAiReviewSummary(metadata)?.sourceCount ?? 0;
}

export function getAiReviewSummaryReviewCount(metadata: unknown) {
  return getStoredReleaseAiReviewSummary(metadata)?.reviewCount ?? 0;
}

export function getAiReviewSummaryEvidenceCount(metadata: unknown) {
  return getStoredReleaseAiReviewSummary(metadata)?.evidence.length ?? 0;
}

export function getAiReviewSummaryDisplayStatus(metadata: unknown) {
  const effective = getReleaseAiReviewSummary(metadata);
  if (!effective) {
    return "missing" as const;
  }

  return effective.isEditorialOverride ? "override" as const : "generated" as const;
}

export function getAiReviewSummaryOverrideFields(metadata: unknown) {
  const override = getReleaseAiReviewSummaryOverride(metadata);
  return {
    isEnabled: override?.isEnabled ?? false,
    overview: override?.overview ?? "",
    overallSentiment: override?.overallSentiment ?? "",
    confidence: override?.confidence ?? "",
    pros: override?.pros.join("\n"),
    cons: override?.cons.join("\n"),
    bestFor: override?.bestFor.join("\n"),
    watchOuts: override?.watchOuts.join("\n"),
  } as {
    isEnabled: boolean;
    overview: string;
    overallSentiment: string;
    confidence: string;
    pros: string;
    cons: string;
    bestFor: string;
    watchOuts: string;
  };
}

export function appendAiReviewSummaryHistory(
  metadata: unknown,
  entry: ReleaseAiReviewSummaryHistoryEntry,
) {
  const base = asRecord(metadata);
  const history = getAiReviewSummaryHistory(base);

  return {
    ...base,
    aiReviewSummaryHistory: [entry, ...history].slice(0, 20),
  };
}

export function getAiReviewSummaryHistory(metadata: unknown): ReleaseAiReviewSummaryHistoryEntry[] {
  const value = asRecord(metadata).aiReviewSummaryHistory;
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const timestamp = typeof record.timestamp === "string" ? record.timestamp : null;
      const eventType =
        record.eventType === "generated" ||
        record.eventType === "refreshed" ||
        record.eventType === "cleared" ||
        record.eventType === "override-enabled" ||
        record.eventType === "override-disabled"
          ? record.eventType
          : null;
      const provider =
        record.provider === "openai" ||
        record.provider === "heuristic" ||
        record.provider === "editorial"
          ? record.provider
          : null;

      if (!timestamp || !eventType) {
        return null;
      }

      return {
        timestamp,
        eventType,
        provider,
        overview: typeof record.overview === "string" ? record.overview : null,
        overallSentiment: readSentiment(record.overallSentiment),
        confidence: readConfidence(record.confidence),
        reviewCount: typeof record.reviewCount === "number" ? record.reviewCount : 0,
        sourceCount: typeof record.sourceCount === "number" ? record.sourceCount : 0,
        evidenceCount: typeof record.evidenceCount === "number" ? record.evidenceCount : 0,
      };
    })
    .filter((entry): entry is ReleaseAiReviewSummaryHistoryEntry => Boolean(entry))
    .slice(0, 20);
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
