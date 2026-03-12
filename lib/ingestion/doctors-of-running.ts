import type { IngestionImporterDefinition, IngestionQuery } from "@/lib/ingestion/types";

function encodeQuery(query: IngestionQuery) {
  return [query.brandName, query.shoeName].filter(Boolean).join(" ").trim();
}

export const doctorsOfRunningImporter: IngestionImporterDefinition = {
  key: "doctors-of-running",
  label: "Doctors of Running",
  sourceSlug: "doctors-of-running",
  description:
    "Planned importer for long-form editorial review coverage from Doctors of Running.",
  normalizeQuery: encodeQuery,
  buildSearchUrl: (query) => {
    const search = encodeURIComponent(encodeQuery(query));
    return `https://www.doctorsofrunning.com/search?q=${search}`;
  },
};
