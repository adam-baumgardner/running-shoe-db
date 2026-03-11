export interface IngestionQuery {
  shoeName: string;
  brandName?: string;
}

export interface IngestionCandidate {
  sourceUrl: string;
  title: string;
  excerpt?: string;
  authorName?: string;
  publishedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface IngestionImporterDefinition {
  key: string;
  label: string;
  sourceSlug: string;
  description: string;
  buildSearchUrl: (query: IngestionQuery) => string;
  normalizeQuery: (query: IngestionQuery) => string;
}

export interface CrawlExecutionResult {
  discoveredCount: number;
  storedCount: number;
  urls: string[];
}
