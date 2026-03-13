const POSITIVE_SIGNALS = [
  "love",
  "great",
  "excellent",
  "favorite",
  "fast",
  "smooth",
  "comfortable",
  "fun",
  "impressive",
  "stable",
  "versatile",
  "responsive",
];

const NEGATIVE_SIGNALS = [
  "bad",
  "harsh",
  "firm",
  "unstable",
  "disappointing",
  "hate",
  "issue",
  "problem",
  "blister",
  "pain",
  "stiff",
  "awkward",
];

export const HIGHLIGHT_PATTERNS = [
  {
    label: "Cushioning",
    patterns: ["cushion", "soft", "firm", "stack", "foam", "protective"],
  },
  {
    label: "Fit",
    patterns: ["fit", "sizing", "wide", "narrow", "upper", "lockdown"],
  },
  {
    label: "Ride",
    patterns: ["ride", "smooth", "transition", "responsive", "bouncy", "snappy"],
  },
  {
    label: "Stability",
    patterns: ["stable", "stability", "wobble", "tippy", "support"],
  },
  {
    label: "Speed",
    patterns: ["tempo", "fast", "race", "workout", "interval", "uptempo"],
  },
  {
    label: "Value",
    patterns: ["value", "price", "worth", "msrp", "expensive", "cheap"],
  },
  {
    label: "Traction",
    patterns: ["traction", "grip", "outsole", "wet", "slip"],
  },
  {
    label: "Durability",
    patterns: ["durable", "durability", "wear", "miles", "hold up"],
  },
];

export function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeParts(parts: Array<string | null | undefined>, maxLength = 420) {
  return parts
    .map((part) => cleanText(part ?? ""))
    .filter((part) => part.length > 0)
    .join(" ")
    .slice(0, maxLength)
    .trim();
}

export function deriveSentiment(texts: string[]) {
  const haystack = normalizeSearchText(texts.join(" "));
  const positiveCount = POSITIVE_SIGNALS.filter((signal) => haystack.includes(signal)).length;
  const negativeCount = NEGATIVE_SIGNALS.filter((signal) => haystack.includes(signal)).length;

  if (positiveCount >= negativeCount + 2) {
    return "positive" as const;
  }

  if (negativeCount >= positiveCount + 2) {
    return "negative" as const;
  }

  return "mixed" as const;
}

export function extractHighlights(texts: string[], maxHighlights = 3) {
  const normalizedTexts = texts.map((text) => normalizeSearchText(text)).filter(Boolean);
  const highlights: string[] = [];

  for (const { label, patterns } of HIGHLIGHT_PATTERNS) {
    if (normalizedTexts.some((text) => patterns.some((pattern) => text.includes(pattern)))) {
      highlights.push(label);
    }

    if (highlights.length >= maxHighlights) {
      break;
    }
  }

  return highlights;
}

export function buildTitleFingerprint(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 1)
    .join(" ");
}

export function areFingerprintsSimilar(left: string, right: string) {
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  const minSize = Math.min(leftTokens.size, rightTokens.size);
  return minSize > 0 && overlap >= Math.max(2, minSize - 1);
}
