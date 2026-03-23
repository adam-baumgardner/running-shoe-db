CREATE TYPE "public"."shoe_spec_audience" AS ENUM('mens', 'womens', 'unisex', 'other', 'unknown');

CREATE TABLE "shoe_spec_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "release_id" uuid NOT NULL,
  "variant_key" varchar(80) NOT NULL,
  "display_label" varchar(80) NOT NULL,
  "audience" "public"."shoe_spec_audience" DEFAULT 'unknown' NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "weight_oz" numeric(4, 1),
  "heel_stack_mm" integer,
  "forefoot_stack_mm" integer,
  "drop_mm" integer,
  "lug_depth_mm" numeric(4, 1),
  "width_notes" text,
  "fit_notes" text,
  "source_notes" text,
  "source_url" text,
  "source_label" varchar(160),
  "last_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shoe_spec_variants"
  ADD CONSTRAINT "shoe_spec_variants_release_id_shoe_releases_id_fk"
  FOREIGN KEY ("release_id") REFERENCES "public"."shoe_releases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "shoe_spec_variants_release_idx" ON "shoe_spec_variants" USING btree ("release_id");
--> statement-breakpoint
CREATE INDEX "shoe_spec_variants_drop_idx" ON "shoe_spec_variants" USING btree ("drop_mm");
--> statement-breakpoint
CREATE UNIQUE INDEX "shoe_spec_variants_release_variant_idx" ON "shoe_spec_variants" USING btree ("release_id", "variant_key");
--> statement-breakpoint
INSERT INTO "shoe_spec_variants" (
  "release_id",
  "variant_key",
  "display_label",
  "audience",
  "is_primary",
  "weight_oz",
  "heel_stack_mm",
  "forefoot_stack_mm",
  "drop_mm",
  "lug_depth_mm",
  "width_notes",
  "fit_notes",
  "source_notes"
)
SELECT
  "release_id",
  'default',
  'Default',
  'unknown',
  true,
  "weight_oz_men",
  "heel_stack_mm",
  "forefoot_stack_mm",
  "drop_mm",
  "lug_depth_mm",
  "width_notes",
  "fit_notes",
  "source_notes"
FROM "shoe_specs"
ON CONFLICT ("release_id", "variant_key") DO NOTHING;
