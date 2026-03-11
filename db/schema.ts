import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const shoeCategoryEnum = pgEnum("shoe_category", [
  "road-daily",
  "road-workout",
  "road-race",
  "trail-daily",
  "trail-race",
  "track-spikes",
  "hiking-fastpack",
]);

export const stabilityEnum = pgEnum("stability_type", ["neutral", "stability"]);

export const terrainEnum = pgEnum("terrain_type", ["road", "trail", "track", "mixed"]);

export const reviewSourceTypeEnum = pgEnum("review_source_type", [
  "editorial",
  "reddit",
  "user",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

export const sentimentEnum = pgEnum("sentiment", ["positive", "mixed", "negative"]);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    websiteUrl: text("website_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("brands_slug_idx").on(table.slug)]
);

export const shoes = pgTable(
  "shoes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    category: shoeCategoryEnum("category").notNull(),
    stability: stabilityEnum("stability").notNull(),
    terrain: terrainEnum("terrain").notNull(),
    usageSummary: text("usage_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shoes_slug_idx").on(table.slug),
    index("shoes_brand_idx").on(table.brandId),
    index("shoes_category_idx").on(table.category),
  ]
);

export const shoeReleases = pgTable(
  "shoe_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shoeId: uuid("shoe_id")
      .notNull()
      .references(() => shoes.id, { onDelete: "cascade" }),
    versionName: varchar("version_name", { length: 160 }).notNull(),
    releaseYear: integer("release_year"),
    releaseDate: timestamp("release_date", { withTimezone: true }),
    msrpUsd: numeric("msrp_usd", { precision: 8, scale: 2 }),
    isCurrent: boolean("is_current").default(true).notNull(),
    isPlated: boolean("is_plated").default(false).notNull(),
    foam: varchar("foam", { length: 160 }),
    upperMaterial: varchar("upper_material", { length: 160 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("shoe_releases_shoe_idx").on(table.shoeId),
    uniqueIndex("shoe_releases_unique_version_idx").on(table.shoeId, table.versionName),
  ]
);

export const shoeSpecs = pgTable(
  "shoe_specs",
  {
    releaseId: uuid("release_id")
      .primaryKey()
      .references(() => shoeReleases.id, { onDelete: "cascade" }),
    weightOzMen: numeric("weight_oz_men", { precision: 4, scale: 1 }),
    weightOzWomen: numeric("weight_oz_women", { precision: 4, scale: 1 }),
    heelStackMm: integer("heel_stack_mm"),
    forefootStackMm: integer("forefoot_stack_mm"),
    dropMm: integer("drop_mm"),
    lugDepthMm: numeric("lug_depth_mm", { precision: 4, scale: 1 }),
    widthNotes: text("width_notes"),
    fitNotes: text("fit_notes"),
    sourceNotes: text("source_notes"),
  },
  (table) => [index("shoe_specs_drop_idx").on(table.dropMm)]
);

export const reviewSources = pgTable(
  "review_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    sourceType: reviewSourceTypeEnum("source_type").notNull(),
    siteUrl: text("site_url"),
    baseDomain: varchar("base_domain", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("review_sources_slug_idx").on(table.slug)]
);

export const reviewAuthors = pgTable(
  "review_authors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id").references(() => reviewSources.id, { onDelete: "set null" }),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    profileUrl: text("profile_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("review_authors_source_idx").on(table.sourceId)]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => shoeReleases.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => reviewSources.id, { onDelete: "restrict" }),
    authorId: uuid("author_id").references(() => reviewAuthors.id, { onDelete: "set null" }),
    sourceUrl: text("source_url").notNull(),
    title: varchar("title", { length: 200 }),
    excerpt: text("excerpt"),
    body: text("body"),
    scoreNormalized100: integer("score_normalized_100"),
    originalScoreValue: numeric("original_score_value", { precision: 6, scale: 2 }),
    originalScoreScale: numeric("original_score_scale", { precision: 6, scale: 2 }),
    sentiment: sentimentEnum("sentiment"),
    status: reviewStatusEnum("status").default("pending").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_release_idx").on(table.releaseId),
    index("reviews_status_idx").on(table.status),
    uniqueIndex("reviews_source_url_idx").on(table.sourceUrl),
  ]
);

export const reviewTags = pgTable(
  "review_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: varchar("label", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
  },
  (table) => [uniqueIndex("review_tags_slug_idx").on(table.slug)]
);

export const reviewTagAssignments = pgTable(
  "review_tag_assignments",
  {
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => reviewTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.reviewId, table.tagId], name: "review_tag_assignments_pk" }),
  ]
);
