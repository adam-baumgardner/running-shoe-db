import type { IngestionImporterDefinition, IngestionQuery } from "@/lib/ingestion/types";

function encodeQuery(query: IngestionQuery) {
  return [query.brandName, query.shoeName].filter(Boolean).join(" ").trim();
}

export const believeInTheRunImporter: IngestionImporterDefinition = {
  key: "believe-in-the-run",
  label: "Believe in the Run",
  sourceSlug: "believe-in-the-run",
  description: "Search editorial review coverage on Believe in the Run by shoe model name.",
  normalizeQuery: encodeQuery,
  buildSearchUrl: (query) => {
    const search = encodeURIComponent(encodeQuery(query));
    return `https://believeintherun.com/?s=${search}`;
  },
};
