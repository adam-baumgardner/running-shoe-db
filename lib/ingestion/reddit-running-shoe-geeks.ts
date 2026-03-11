import type { IngestionImporterDefinition, IngestionQuery } from "@/lib/ingestion/types";

function encodeQuery(query: IngestionQuery) {
  return [query.brandName, query.shoeName].filter(Boolean).join(" ").trim();
}

export const redditRunningShoeGeeksImporter: IngestionImporterDefinition = {
  key: "reddit-running-shoe-geeks",
  label: "Reddit RunningShoeGeeks",
  sourceSlug: "reddit-running-shoe-geeks",
  description: "Search r/RunningShoeGeeks threads for shoe-specific community sentiment and discussion.",
  normalizeQuery: encodeQuery,
  buildSearchUrl: (query) => {
    const search = encodeURIComponent(encodeQuery(query));
    return `https://www.reddit.com/r/RunningShoeGeeks/search/?q=${search}&restrict_sr=1&sort=relevance`;
  },
};
