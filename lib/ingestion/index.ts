import { believeInTheRunImporter } from "@/lib/ingestion/believe-in-the-run";
import { redditRunningShoeGeeksImporter } from "@/lib/ingestion/reddit-running-shoe-geeks";
import type { IngestionImporterDefinition } from "@/lib/ingestion/types";

export const ingestionImporters: IngestionImporterDefinition[] = [
  believeInTheRunImporter,
  redditRunningShoeGeeksImporter,
];

export function getImporterByKey(key: string) {
  return ingestionImporters.find((importer) => importer.key === key) ?? null;
}
