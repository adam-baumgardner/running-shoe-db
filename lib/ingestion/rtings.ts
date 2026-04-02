import type { IngestionImporterDefinition, IngestionQuery } from "@/lib/ingestion/types";

function encodeQuery(query: IngestionQuery) {
  return [query.brandName, query.shoeName].filter(Boolean).join(" ").trim();
}

export const rtingsImporter: IngestionImporterDefinition = {
  key: "rtings",
  label: "RTINGS",
  sourceSlug: "rtings",
  description: "Editorial importer for RTINGS running shoe reviews.",
  normalizeQuery: encodeQuery,
  buildSearchUrl: (query) => {
    const search = encodeURIComponent(encodeQuery(query));
    return `https://www.rtings.com/search?query=${search}`;
  },
};
