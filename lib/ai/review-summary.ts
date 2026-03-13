import { z } from "zod";
import type { ReleaseAiReviewSummary, ReviewConfidence, ReviewSentiment } from "@/lib/server/release-metadata";
import { normalizeSearchText } from "@/lib/ingestion/review-normalization";

const aiSummarySchema = z.object({
  overview: z.string().min(1).max(500),
  overallSentiment: z.enum(["positive", "mixed", "negative"]),
  confidence: z.enum(["low", "medium", "high"]),
  pros: z.array(z.string().min(1).max(120)).max(4),
  cons: z.array(z.string().min(1).max(120)).max(4),
  bestFor: z.array(z.string().min(1).max(120)).max(4),
  watchOuts: z.array(z.string().min(1).max(120)).max(4),
});

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
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You summarize running shoe reviews. Use only the supplied evidence. Produce concise, factual product guidance. Do not invent specs or opinions.",
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
            },
            required: [
              "overview",
              "overallSentiment",
              "confidence",
              "pros",
              "cons",
              "bestFor",
              "watchOuts",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
  };
  const parsed = aiSummarySchema.parse(JSON.parse(payload.output_text ?? "{}"));

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
    pros: withFallback(pros, overallSentiment === "negative" ? [] : ["Promising overall ride signal across current sources."]),
    cons: withFallback(cons, overallSentiment === "positive" ? ["Tradeoffs are still limited in the current review set."] : ["Mixed feedback across the current review set."]),
    bestFor,
    watchOuts,
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
    values.add("The current review set is not fully aligned, so treat the consensus as provisional.");
  }
  if (!values.size) {
    values.add(`Signal is still developing for this ${input.category.toLowerCase()} model.`);
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
  return `${lead} Confidence is ${confidence}.${pro}${con}`.trim();
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
