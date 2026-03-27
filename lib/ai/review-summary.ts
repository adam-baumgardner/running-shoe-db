import { z } from "zod";
import type { ReleaseAiReviewSummary, ReviewConfidence, ReviewSentiment } from "@/lib/server/release-metadata";
import { normalizeSearchText } from "@/lib/ingestion/review-normalization";

const aiSummarySchema = z.object({
  overview: z.string().min(1).max(500),
  overallSentiment: z.enum(["positive", "mixed", "negative"]),
  confidence: z.enum(["low", "medium", "high"]),
  editorialSentiment: z.enum(["positive", "mixed", "negative"]).nullable(),
  communitySentiment: z.enum(["positive", "mixed", "negative"]).nullable(),
  sourceAlignment: z.enum(["aligned", "mixed", "divergent"]),
  buyerSignal: z.string().min(1).max(220).nullable(),
  pros: z.array(z.string().min(1).max(120)).max(4),
  cons: z.array(z.string().min(1).max(120)).max(4),
  bestFor: z.array(z.string().min(1).max(120)).max(4),
  watchOuts: z.array(z.string().min(1).max(120)).max(4),
  consensusPoints: z.array(z.string().min(1).max(140)).max(4),
  debates: z.array(z.string().min(1).max(140)).max(4),
});

const NEGATIVE_BIASED_TERMS = new Set(["Value", "Fit"]);
const MIXED_SIGNAL_TERMS = new Set(["Fit", "Ride", "Value", "Stability"]);

interface ReviewSummaryInput {
  id?: string | null;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  scoreNormalized100: number | null;
  sentiment: ReviewSentiment | null;
  publishedAt: string | null;
  sourceName: string;
  sourceType: "editorial" | "reddit" | "user";
  authorName: string | null;
}

interface GenerateReleaseReviewSummaryInput {
  releaseLabel: string;
  category: string;
  terrain: string;
  stability: string;
  reviews: ReviewSummaryInput[];
}

export async function generateReleaseReviewSummary(
  input: GenerateReleaseReviewSummaryInput,
): Promise<ReleaseAiReviewSummary> {
  const reviews = input.reviews.filter((review) => review.excerpt || review.body || review.title);
  if (!reviews.length) {
    throw new Error("At least one approved review is required to generate an AI summary.");
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAi({
        ...input,
        reviews,
      });
    } catch (error) {
      console.error("AI review summary generation failed, falling back to heuristic summary.", error);
    }
  }

  return buildHeuristicSummary({
    ...input,
    reviews,
  });
}

async function generateWithOpenAi(
  input: GenerateReleaseReviewSummaryInput & { reviews: ReviewSummaryInput[] },
): Promise<ReleaseAiReviewSummary> {
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const requestBody = JSON.stringify({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You summarize running shoe reviews and community discussion. Use only the supplied evidence. Produce concise, factual buyer guidance in plain product language. Distinguish broad consensus from contested points. Explicitly judge editorial sentiment, community sentiment, and whether those two reads align. Prefer specific takeaways over generic hedging. Do not invent specs, comparisons, or opinions that are not supported by the supplied reviews.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              release: {
                label: input.releaseLabel,
                category: input.category,
                terrain: input.terrain,
                stability: input.stability,
              },
              instructions: {
                overview:
                  "Write 2-3 sentences that summarize what this shoe is generally like for a buyer right now.",
                buyerSignal:
                  "Write one short line that says what kind of buyer signal the current mix of reviews gives.",
                consensusPoints:
                  "These should be specific patterns reviewers broadly agree on.",
                debates:
                  "These should capture where reviewers disagree or where editorial and community read the shoe differently.",
                channelReads:
                  "Set editorialSentiment and communitySentiment from the actual evidence, not by guessing. If one channel is effectively absent, return null for that channel.",
              },
              reviews: input.reviews.map((review) => ({
                title: review.title,
                sourceName: review.sourceName,
                sourceType: review.sourceType,
                authorName: review.authorName,
                publishedAt: review.publishedAt,
                sentiment: review.sentiment,
                scoreNormalized100: review.scoreNormalized100,
                excerpt: truncateText(review.excerpt, 320),
                body: truncateText(review.body, 900),
              })),
            }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "shoe_review_summary",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            overview: { type: "string" },
            overallSentiment: { type: "string", enum: ["positive", "mixed", "negative"] },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            editorialSentiment: { type: ["string", "null"], enum: ["positive", "mixed", "negative", null] },
            communitySentiment: { type: ["string", "null"], enum: ["positive", "mixed", "negative", null] },
            sourceAlignment: { type: "string", enum: ["aligned", "mixed", "divergent"] },
            buyerSignal: { type: ["string", "null"] },
            pros: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            cons: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            bestFor: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            watchOuts: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            consensusPoints: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
            debates: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
            },
          },
          required: [
            "overview",
            "overallSentiment",
            "confidence",
            "editorialSentiment",
            "communitySentiment",
            "sourceAlignment",
            "buyerSignal",
            "pros",
            "cons",
            "bestFor",
            "watchOuts",
            "consensusPoints",
            "debates",
          ],
        },
      },
    },
  });

  let response: Response | null = null;
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: requestBody,
        signal: AbortSignal.timeout(45_000),
      });
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await sleep(Math.min(5_000 * attempt, 20_000));
      continue;
    }

    if (response.ok) {
      break;
    }

    if (response.status !== 429 || attempt === maxAttempts) {
      break;
    }

    await sleep(getRetryDelayMs(response, attempt));
  }

  if (!response?.ok) {
    const status = response?.status ?? "unknown";
    throw new Error(`OpenAI request failed with status ${status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const rawOutput = extractResponseText(payload);
  if (!rawOutput) {
    throw new Error(`OpenAI response did not include parsable text output: ${JSON.stringify(payload).slice(0, 1200)}`);
  }

  const parsed = aiSummarySchema.parse(sanitizeAiSummaryCandidate(JSON.parse(rawOutput)));

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    reviewCount: input.reviews.length,
    sourceCount: new Set(input.reviews.map((review) => `${review.sourceType}:${review.sourceName}`)).size,
    model,
    provider: "openai" as const,
    evidence: buildEvidence(input.reviews),
    isEditorialOverride: false,
  };
}

function extractResponseText(payload: Record<string, unknown>): string | null {
  const topLevelOutputText = typeof payload.output_text === "string" ? payload.output_text : null;
  if (topLevelOutputText && topLevelOutputText.trim()) {
    return extractJsonObject(topLevelOutputText);
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content?: unknown }).content as unknown[])
      : [];

    for (const entry of content) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const candidate = extractTextCandidate(entry as Record<string, unknown>);
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

function extractTextCandidate(entry: Record<string, unknown>): string | null {
  const directText = typeof entry.text === "string" ? entry.text : null;
  if (directText && directText.trim()) {
    return extractJsonObject(directText);
  }

  const nestedText = entry.text;
  if (nestedText && typeof nestedText === "object") {
    const value = (nestedText as { value?: unknown }).value;
    if (typeof value === "string" && value.trim()) {
      return extractJsonObject(value);
    }
  }

  const jsonValue = entry.json;
  if (jsonValue && typeof jsonValue === "object") {
    return JSON.stringify(jsonValue);
  }

  const argumentsValue = entry.arguments;
  if (typeof argumentsValue === "string" && argumentsValue.trim()) {
    return extractJsonObject(argumentsValue);
  }

  return null;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function sanitizeAiSummaryCandidate(candidate: unknown): unknown {
  if (!candidate || typeof candidate !== "object") {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;
  return {
    ...record,
    overview: sanitizeOptionalString(record.overview, 500),
    buyerSignal: sanitizeNullableString(record.buyerSignal, 220),
    pros: sanitizeStringArray(record.pros, 120, 4),
    cons: sanitizeStringArray(record.cons, 120, 4),
    bestFor: sanitizeStringArray(record.bestFor, 120, 4),
    watchOuts: sanitizeStringArray(record.watchOuts, 120, 4),
    consensusPoints: sanitizeStringArray(record.consensusPoints, 140, 4),
    debates: sanitizeStringArray(record.debates, 140, 4),
  };
}

function sanitizeOptionalString(value: unknown, maxLength: number): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().slice(0, maxLength);
}

function sanitizeNullableString(value: unknown, maxLength: number): unknown {
  if (value === null) {
    return null;
  }

  return sanitizeOptionalString(value, maxLength);
}

function sanitizeStringArray(value: unknown, maxLength: number, maxItems: number): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .slice(0, maxItems)
    .map((entry) => (typeof entry === "string" ? entry.trim().slice(0, maxLength) : entry))
    .filter((entry) => typeof entry !== "string" || entry.length > 0);
}

function getRetryDelayMs(response: Response, attempt: number): number {
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(12_000, 1_500 * 2 ** (attempt - 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildHeuristicSummary(input: GenerateReleaseReviewSummaryInput & { reviews: ReviewSummaryInput[] }): ReleaseAiReviewSummary {
  const weightedSentiment = {
    positive: 0,
    mixed: 0,
    negative: 0,
  };
  const termCounts = new Map<string, { count: number; positive: number; negative: number }>();

  for (const review of input.reviews) {
    const weight = getReviewWeight(review);
    if (review.sentiment) {
      weightedSentiment[review.sentiment] += weight;
    } else {
      weightedSentiment.mixed += weight * 0.7;
    }

    const terms = inferTerms(review);
    for (const term of terms) {
      const entry = termCounts.get(term) ?? { count: 0, positive: 0, negative: 0 };
      entry.count += 1;
      if (review.sentiment === "positive") {
        entry.positive += 1;
      }
      if (review.sentiment === "negative") {
        entry.negative += 1;
      }
      termCounts.set(term, entry);
    }
  }

  const overallSentiment = getDominantSentiment(weightedSentiment);
  const sortedTerms = [...termCounts.entries()].sort((left, right) => right[1].count - left[1].count);
  const pros = sortedTerms
    .filter(([, value]) => value.positive >= value.negative)
    .slice(0, 3)
    .map(([term]) => buildProsConsSentence(term, "positive"));
  const cons = sortedTerms
    .filter(([, value]) => value.negative > value.positive)
    .slice(0, 3)
    .map(([term]) => buildProsConsSentence(term, "negative"));
  const bestFor = buildBestFor(input, sortedTerms.map(([term]) => term));
  const watchOuts = buildWatchOuts(input, sortedTerms.map(([term]) => term), overallSentiment);
  const confidence = getConfidence(input.reviews.length, new Set(input.reviews.map((review) => review.sourceName)).size, overallSentiment);

  return {
    overview: buildOverview(input, overallSentiment, confidence, pros, cons),
    overallSentiment,
    confidence,
    editorialSentiment: getChannelSentiment(input.reviews.filter((review) => review.sourceType === "editorial"), overallSentiment),
    communitySentiment: getChannelSentiment(input.reviews.filter((review) => review.sourceType !== "editorial"), overallSentiment),
    sourceAlignment: deriveSourceAlignment(
      getChannelSentiment(input.reviews.filter((review) => review.sourceType === "editorial"), overallSentiment),
      getChannelSentiment(input.reviews.filter((review) => review.sourceType !== "editorial"), overallSentiment),
    ),
    buyerSignal: buildBuyerSignal(input, overallSentiment, confidence),
    pros: withFallback(pros, overallSentiment === "negative" ? [] : ["Promising overall ride signal across current sources."]),
    cons: withFallback(cons, overallSentiment === "positive" ? ["Tradeoffs are still limited in the current review set."] : ["Mixed feedback across the current review set."]),
    bestFor,
    watchOuts,
    consensusPoints: buildConsensusPoints(sortedTerms.map(([term]) => term), overallSentiment),
    debates: buildDebates(sortedTerms.map(([term]) => term), overallSentiment),
    reviewCount: input.reviews.length,
    sourceCount: new Set(input.reviews.map((review) => `${review.sourceType}:${review.sourceName}`)).size,
    generatedAt: new Date().toISOString(),
    model: null,
    provider: "heuristic" as const,
    evidence: buildEvidence(input.reviews),
    isEditorialOverride: false,
  };
}

function buildEvidence(reviews: ReviewSummaryInput[]) {
  return reviews
    .map((review) => ({
      sourceName: review.sourceName,
      sourceType: review.sourceType,
      title: review.title,
      excerpt: truncateText(review.excerpt ?? review.body ?? review.title, 220) ?? "",
    }))
    .filter((review) => review.excerpt)
    .slice(0, 6);
}

function inferTerms(review: ReviewSummaryInput) {
  const haystack = normalizeSearchText(`${review.title ?? ""} ${review.excerpt ?? ""} ${review.body ?? ""}`);
  const matches = new Set<string>();
  const patternMap = [
    { label: "Fit", patterns: ["fit", "upper", "toe box", "lockdown", "roomy", "narrow"] },
    { label: "Ride", patterns: ["ride", "transition", "roll", "stable ride", "smooth"] },
    { label: "Cushioning", patterns: ["cushion", "soft", "firm", "protective", "comfort"] },
    { label: "Speed", patterns: ["fast", "tempo", "speed", "snappy", "responsive"] },
    { label: "Value", patterns: ["value", "price", "worth", "expensive", "overpriced"] },
    { label: "Stability", patterns: ["stable", "stability", "supportive", "tippy"] },
    { label: "Traction", patterns: ["traction", "grip", "outsole", "slippery"] },
    { label: "Durability", patterns: ["durable", "durability", "wear", "rubber"] },
  ];

  for (const pattern of patternMap) {
    if (pattern.patterns.some((term) => haystack.includes(term))) {
      matches.add(pattern.label);
    }
  }

  return [...matches];
}

function buildProsConsSentence(term: string, sentiment: "positive" | "negative") {
  const positiveMap: Record<string, string> = {
    Fit: "Fit feedback trends positive overall.",
    Ride: "Ride quality is a recurring positive theme.",
    Cushioning: "Cushioning is generally well received.",
    Speed: "Speed and responsiveness show up consistently.",
    Value: "Value looks strong relative to the market.",
    Stability: "Stability and control are recurring positives.",
    Traction: "Traction feedback is mostly favorable.",
    Durability: "Durability signal looks positive so far.",
  };
  const negativeMap: Record<string, string> = {
    Fit: "Fit is the most common area of hesitation.",
    Ride: "Ride feel is a recurring complaint.",
    Cushioning: "Cushioning setup is a frequent tradeoff.",
    Speed: "Speed expectations are not universally met.",
    Value: "Price-to-performance is a common concern.",
    Stability: "Stability is a concern in some reviews.",
    Traction: "Traction confidence is uneven.",
    Durability: "Durability confidence is still weak.",
  };

  return sentiment === "positive" ? positiveMap[term] ?? `${term} trends positive.` : negativeMap[term] ?? `${term} trends negative.`;
}

function buildBestFor(
  input: GenerateReleaseReviewSummaryInput,
  terms: string[],
) {
  const values = new Set<string>();
  if (terms.includes("Speed")) {
    values.add("Runners who want a shoe that can handle faster training and uptempo work.");
  }
  if (terms.includes("Cushioning")) {
    values.add("Runners looking for a more protective daily or long-run ride.");
  }
  if (input.terrain.toLowerCase() === "trail") {
    values.add("Trail runners who care about grip and underfoot confidence.");
  }
  if (input.stability.toLowerCase() === "stability") {
    values.add("Runners who want extra guidance without moving into a heavy stability shoe.");
  }
  if (!values.size) {
    values.add("Runners comparing this model against its direct category peers.");
  }

  return [...values].slice(0, 3);
}

function buildWatchOuts(
  input: GenerateReleaseReviewSummaryInput,
  terms: string[],
  overallSentiment: ReviewSentiment,
) {
  const values = new Set<string>();
  if (terms.includes("Fit")) {
    values.add("Fit comments vary enough that sizing and upper shape should be checked closely.");
  }
  if (terms.includes("Value")) {
    values.add("Price-to-performance comes up often, so compare MSRP against close alternatives.");
  }
  if (overallSentiment === "mixed" || overallSentiment === "negative") {
    values.add("Fit your expectations to the shoe's more specific use case rather than treating it like a do-everything option.");
  }
  if (!values.size) {
    values.add(`Compare this ${input.category.toLowerCase()} model against shoes with a similar ride profile and intended use.`);
  }

  return [...values].slice(0, 3);
}

function buildOverview(
  input: GenerateReleaseReviewSummaryInput,
  overallSentiment: ReviewSentiment,
  confidence: ReviewConfidence,
  pros: string[],
  cons: string[],
) {
  const sentimentPhrase =
    overallSentiment === "positive"
      ? "mostly positive"
      : overallSentiment === "negative"
        ? "mostly negative"
        : "mixed";
  const lead = `${input.releaseLabel} is landing with ${sentimentPhrase} sentiment across the current approved review set.`;
  const pro = pros[0] ? ` ${pros[0]}` : "";
  const con = cons[0] ? ` Main caution: ${cons[0].replace(/\.$/, "")}.` : "";
  return `${lead}${pro}${con}`.trim();
}

function buildBuyerSignal(
  input: GenerateReleaseReviewSummaryInput,
  overallSentiment: ReviewSentiment,
  confidence: ReviewConfidence,
) {
  const tone =
    overallSentiment === "positive"
      ? "Broadly positive"
      : overallSentiment === "negative"
        ? "Cautious"
        : "Mixed";

  return `${tone} buyer signal for ${input.category.toLowerCase()} use with ${confidence} confidence.`;
}

function getChannelSentiment(reviews: ReviewSummaryInput[], fallback: ReviewSentiment) {
  if (!reviews.length) {
    return null;
  }

  const weighted = {
    positive: 0,
    mixed: 0,
    negative: 0,
  };

  for (const review of reviews) {
    weighted[review.sentiment ?? fallback] += getReviewWeight(review);
  }

  return getDominantSentiment(weighted);
}

function deriveSourceAlignment(
  editorialSentiment: ReviewSentiment | null,
  communitySentiment: ReviewSentiment | null,
) {
  if (!editorialSentiment || !communitySentiment) {
    return "mixed" as const;
  }

  if (editorialSentiment === communitySentiment) {
    return "aligned" as const;
  }

  if (
    (editorialSentiment === "positive" && communitySentiment === "negative")
    || (editorialSentiment === "negative" && communitySentiment === "positive")
  ) {
    return "divergent" as const;
  }

  return "mixed" as const;
}

function buildConsensusPoints(terms: string[], overallSentiment: ReviewSentiment) {
  const consensus = terms
    .filter((term) => !NEGATIVE_BIASED_TERMS.has(term))
    .slice(0, 3)
    .map((term) => buildProsConsSentence(term, overallSentiment === "negative" ? "negative" : "positive"));

  return withFallback(consensus, ["Consensus is still forming across the current sources."]);
}

function buildDebates(terms: string[], overallSentiment: ReviewSentiment) {
  const debates = terms
    .filter((term) => MIXED_SIGNAL_TERMS.has(term) || (overallSentiment === "mixed" && NEGATIVE_BIASED_TERMS.has(term)))
    .slice(0, 3)
    .map((term) => `Some reviews diverge on ${term.toLowerCase()}.`);

  return withFallback(debates, overallSentiment === "mixed" ? ["Sources disagree on a few buying tradeoffs."] : []);
}

function truncateText(value: string | null, limit: number) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, limit - 1)}…`;
}

function getReviewWeight(review: ReviewSummaryInput) {
  const sourceWeight = review.sourceType === "editorial" ? 1 : review.sourceType === "reddit" ? 0.7 : 0.55;
  return sourceWeight;
}

function getDominantSentiment(weightedSentiment: Record<ReviewSentiment, number>): ReviewSentiment {
  if (weightedSentiment.positive >= weightedSentiment.mixed && weightedSentiment.positive >= weightedSentiment.negative) {
    return "positive";
  }
  if (weightedSentiment.negative >= weightedSentiment.mixed && weightedSentiment.negative >= weightedSentiment.positive) {
    return "negative";
  }
  return "mixed";
}

function getConfidence(reviewCount: number, sourceCount: number, overallSentiment: ReviewSentiment): ReviewConfidence {
  if (reviewCount >= 5 && sourceCount >= 3) {
    return "high";
  }
  if (reviewCount >= 2 && sourceCount >= 2) {
    return overallSentiment === "mixed" ? "medium" : "medium";
  }
  return "low";
}

function withFallback(values: string[], fallback: string[]) {
  return (values.length ? values : fallback).slice(0, 3);
}
