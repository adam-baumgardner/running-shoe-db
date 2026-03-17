CREATE TYPE "public"."review_source_type" AS ENUM('editorial', 'reddit', 'user');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('positive', 'mixed', 'negative');--> statement-breakpoint
CREATE TYPE "public"."shoe_category" AS ENUM('road-daily', 'road-workout', 'road-race', 'trail-daily', 'trail-race', 'track-spikes', 'hiking-fastpack');--> statement-breakpoint
CREATE TYPE "public"."stability_type" AS ENUM('neutral', 'stability');--> statement-breakpoint
CREATE TYPE "public"."terrain_type" AS ENUM('road', 'trail', 'track', 'mixed');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"display_name" varchar(160) NOT NULL,
	"profile_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"source_type" "review_source_type" NOT NULL,
	"site_url" text,
	"base_domain" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_tag_assignments" (
	"review_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "review_tag_assignments_pk" PRIMARY KEY("review_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "review_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(80) NOT NULL,
	"slug" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"author_id" uuid,
	"source_url" text NOT NULL,
	"title" varchar(200),
	"excerpt" text,
	"body" text,
	"score_normalized_100" integer,
	"original_score_value" numeric(6, 2),
	"original_score_scale" numeric(6, 2),
	"sentiment" "sentiment",
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoe_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoe_id" uuid NOT NULL,
	"version_name" varchar(160) NOT NULL,
	"release_year" integer,
	"release_date" timestamp with time zone,
	"msrp_usd" numeric(8, 2),
	"is_current" boolean DEFAULT true NOT NULL,
	"is_plated" boolean DEFAULT false NOT NULL,
	"foam" varchar(160),
	"upper_material" varchar(160),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoe_specs" (
	"release_id" uuid PRIMARY KEY NOT NULL,
	"weight_oz_men" numeric(4, 1),
	"weight_oz_women" numeric(4, 1),
	"heel_stack_mm" integer,
	"forefoot_stack_mm" integer,
	"drop_mm" integer,
	"lug_depth_mm" numeric(4, 1),
	"width_notes" text,
	"fit_notes" text,
	"source_notes" text
);
--> statement-breakpoint
CREATE TABLE "shoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"category" "shoe_category" NOT NULL,
	"stability" "stability_type" NOT NULL,
	"terrain" "terrain_type" NOT NULL,
	"usage_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_authors" ADD CONSTRAINT "review_authors_source_id_review_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."review_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tag_assignments" ADD CONSTRAINT "review_tag_assignments_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tag_assignments" ADD CONSTRAINT "review_tag_assignments_tag_id_review_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."review_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_release_id_shoe_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."shoe_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_source_id_review_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."review_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_review_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."review_authors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoe_releases" ADD CONSTRAINT "shoe_releases_shoe_id_shoes_id_fk" FOREIGN KEY ("shoe_id") REFERENCES "public"."shoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoe_specs" ADD CONSTRAINT "shoe_specs_release_id_shoe_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."shoe_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoes" ADD CONSTRAINT "shoes_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "review_authors_source_idx" ON "review_authors" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_sources_slug_idx" ON "review_sources" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "review_tags_slug_idx" ON "review_tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "reviews_release_idx" ON "reviews" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_source_url_idx" ON "reviews" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX "shoe_releases_shoe_idx" ON "shoe_releases" USING btree ("shoe_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shoe_releases_unique_version_idx" ON "shoe_releases" USING btree ("shoe_id","version_name");--> statement-breakpoint
CREATE INDEX "shoe_specs_drop_idx" ON "shoe_specs" USING btree ("drop_mm");--> statement-breakpoint
CREATE UNIQUE INDEX "shoes_slug_idx" ON "shoes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "shoes_brand_idx" ON "shoes" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "shoes_category_idx" ON "shoes" USING btree ("category");