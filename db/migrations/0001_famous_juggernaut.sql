CREATE TYPE "public"."crawl_run_status" AS ENUM('queued', 'running', 'succeeded', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."crawl_target_type" AS ENUM('search', 'listing', 'api');--> statement-breakpoint
CREATE TABLE "crawl_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crawl_source_id" uuid NOT NULL,
	"status" "crawl_run_status" DEFAULT 'queued' NOT NULL,
	"query" varchar(240),
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"discovered_count" integer DEFAULT 0 NOT NULL,
	"stored_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawl_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_source_id" uuid NOT NULL,
	"importer_key" varchar(120) NOT NULL,
	"target_type" "crawl_target_type" NOT NULL,
	"target_url" text NOT NULL,
	"search_pattern" varchar(240),
	"cadence_label" varchar(80),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crawl_run_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"content_type" varchar(120),
	"title" varchar(240),
	"excerpt" text,
	"raw_text" text,
	"metadata" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_crawl_source_id_crawl_sources_id_fk" FOREIGN KEY ("crawl_source_id") REFERENCES "public"."crawl_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawl_sources" ADD CONSTRAINT "crawl_sources_review_source_id_review_sources_id_fk" FOREIGN KEY ("review_source_id") REFERENCES "public"."review_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_documents" ADD CONSTRAINT "raw_documents_crawl_run_id_crawl_runs_id_fk" FOREIGN KEY ("crawl_run_id") REFERENCES "public"."crawl_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crawl_runs_source_idx" ON "crawl_runs" USING btree ("crawl_source_id");--> statement-breakpoint
CREATE INDEX "crawl_runs_status_idx" ON "crawl_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crawl_sources_review_source_idx" ON "crawl_sources" USING btree ("review_source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crawl_sources_importer_target_idx" ON "crawl_sources" USING btree ("importer_key","target_url");--> statement-breakpoint
CREATE INDEX "raw_documents_run_idx" ON "raw_documents" USING btree ("crawl_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_documents_run_source_idx" ON "raw_documents" USING btree ("crawl_run_id","source_url");