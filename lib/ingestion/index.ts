import { believeInTheRunImporter } from "@/lib/ingestion/believe-in-the-run";
import { doctorsOfRunningImporter } from "@/lib/ingestion/doctors-of-running";
import { redditRunningShoeGeeksImporter } from "@/lib/ingestion/reddit-running-shoe-geeks";
import { runRepeatImporter } from "@/lib/ingestion/runrepeat";
import type { IngestionImporterDefinition } from "@/lib/ingestion/types";

export const ingestionImporters: IngestionImporterDefinition[] = [
  believeInTheRunImporter,
  doctorsOfRunningImporter,
  redditRunningShoeGeeksImporter,
  runRepeatImporter,
];

export function getImporterByKey(key: string) {
  return ingestionImporters.find((importer) => importer.key === key) ?? null;
}
