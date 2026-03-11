export const featuredShoe = {
  brand: "Nike",
  name: "Pegasus 40",
  category: "Road daily trainer",
  rideProfile: "Neutral, moderate stack, non-plated",
  weightOz: 9.4,
  dropMm: 10,
};

export const homepageSections = [
  {
    kicker: "Catalog",
    title: "Spec sheets that stay readable",
    description:
      "Each shoe page will combine technical specs, release context, and colorway or version history without burying the useful details.",
  },
  {
    kicker: "Reviews",
    title: "Source-backed opinions, not anonymous noise",
    description:
      "We will aggregate trusted editorial reviews and community sentiment from places like Reddit, with clear attribution and moderation controls.",
  },
  {
    kicker: "Comparison",
    title: "Filters that map to how runners actually buy",
    description:
      "Search and comparison will center on use case, ride feel, stability, weight, stack, drop, and price tier rather than generic product grids.",
  },
] as const;

export const shoes = [
  featuredShoe,
  {
    brand: "Saucony",
    name: "Endorphin Speed 4",
    category: "Road workout trainer",
    rideProfile: "Neutral, nylon-plated, versatile",
    weightOz: 8.2,
    dropMm: 8,
  },
  {
    brand: "Hoka",
    name: "Mach 6",
    category: "Road lightweight trainer",
    rideProfile: "Neutral, responsive, non-plated",
    weightOz: 8.2,
    dropMm: 5,
  },
] as const;

export const reviewPipeline = [
  {
    kicker: "Sources",
    title: "Collect from known publishers and curated Reddit threads",
    description:
      "Every imported review should retain source URL, author identity when available, and publication context.",
  },
  {
    kicker: "Curation",
    title: "Moderate before anything becomes public",
    description:
      "We need a workflow for duplicate detection, bad-source rejection, and structured tagging of review claims.",
  },
  {
    kicker: "Presentation",
    title: "Show consensus without hiding disagreement",
    description:
      "The product should surface both an aggregate sentiment signal and the reasons reviewers diverge on fit, ride, and durability.",
  },
] as const;
