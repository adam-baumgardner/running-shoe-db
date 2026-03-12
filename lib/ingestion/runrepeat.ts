import type { IngestionImporterDefinition, IngestionQuery } from "@/lib/ingestion/types";

function encodeQuery(query: IngestionQuery) {
  return [query.brandName, query.shoeName].filter(Boolean).join(" ").trim();
}

export const runRepeatImporter: IngestionImporterDefinition = {
  key: "runrepeat",
  label: "RunRepeat",
  sourceSlug: "runrepeat",
  description:
    "Planned importer for structured shoe review and spec coverage from RunRepeat.",
  normalizeQuery: encodeQuery,
  buildSearchUrl: (query) => {
    const search = encodeURIComponent(encodeQuery(query));
    return `https://runrepeat.com/catalog/search?q=${search}`;
  },
};
