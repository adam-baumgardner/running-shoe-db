import type { IngestionImporterDefinition, IngestionQuery } from "@/lib/ingestion/types";

function encodeQuery(query: IngestionQuery) {
  return [query.brandName, query.shoeName].filter(Boolean).join(" ").trim();
}

export const roadTrailRunImporter: IngestionImporterDefinition = {
  key: "roadtrailrun",
  label: "RoadTrailRun",
  sourceSlug: "roadtrailrun",
  description: "Editorial importer for RoadTrailRun shoe review coverage.",
  normalizeQuery: encodeQuery,
  buildSearchUrl: (query) => {
    const search = encodeURIComponent(encodeQuery(query));
    return `https://www.roadtrailrun.com/search?q=${search}`;
  },
};
