import type { reviewSourceTypes, stabilityTypes, terrains } from "@/lib/domain/shoes";

type Terrain = (typeof terrains)[number];
type Stability = (typeof stabilityTypes)[number];
type ReviewSourceType = (typeof reviewSourceTypes)[number];

export interface SeedBrand {
  name: string;
  slug: string;
  websiteUrl: string;
}

export interface SeedShoe {
  brandSlug: string;
  name: string;
  slug: string;
  category:
    | "road-daily"
    | "road-workout"
    | "road-race"
    | "trail-daily"
    | "trail-race"
    | "track-spikes"
    | "hiking-fastpack";
  stability: Stability;
  terrain: Terrain;
  usageSummary: string;
}

export interface SeedRelease {
  shoeSlug: string;
  versionName: string;
  releaseYear: number;
  msrpUsd: string;
  isCurrent: boolean;
  isPlated: boolean;
  foam: string;
  notes: string;
}

export interface SeedSpec {
  releaseKey: string;
  weightOzMen: string;
  heelStackMm: number;
  forefootStackMm: number;
  dropMm: number;
  fitNotes: string;
}

export interface SeedReviewSource {
  name: string;
  slug: string;
  sourceType: ReviewSourceType;
  siteUrl: string;
  baseDomain: string;
}

export const seedBrands: SeedBrand[] = [
  { name: "Nike", slug: "nike", websiteUrl: "https://www.nike.com" },
  { name: "Saucony", slug: "saucony", websiteUrl: "https://www.saucony.com" },
  { name: "Hoka", slug: "hoka", websiteUrl: "https://www.hoka.com" },
];

export const seedShoes: SeedShoe[] = [
  {
    brandSlug: "nike",
    name: "Pegasus",
    slug: "nike-pegasus",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Everyday mileage for runners who want a familiar neutral trainer.",
  },
  {
    brandSlug: "saucony",
    name: "Endorphin Speed",
    slug: "saucony-endorphin-speed",
    category: "road-workout",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Fast training shoe for workouts and long runs with some bounce.",
  },
  {
    brandSlug: "hoka",
    name: "Mach",
    slug: "hoka-mach",
    category: "road-workout",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Lightweight trainer for runners who want a snappy but non-plated ride.",
  },
];

export const seedReleases: SeedRelease[] = [
  {
    shoeSlug: "nike-pegasus",
    versionName: "Pegasus 41",
    releaseYear: 2024,
    msrpUsd: "140.00",
    isCurrent: true,
    isPlated: false,
    foam: "ReactX",
    notes: "Mainstream daily trainer with broad fit familiarity.",
  },
  {
    shoeSlug: "saucony-endorphin-speed",
    versionName: "Endorphin Speed 4",
    releaseYear: 2024,
    msrpUsd: "170.00",
    isCurrent: true,
    isPlated: true,
    foam: "PWRRUN PB",
    notes: "Versatile plated trainer positioned between daily and race use.",
  },
  {
    shoeSlug: "hoka-mach",
    versionName: "Mach 6",
    releaseYear: 2024,
    msrpUsd: "140.00",
    isCurrent: true,
    isPlated: false,
    foam: "Super Critical EVA",
    notes: "Lightweight neutral trainer without a plate.",
  },
];

export const seedSpecs: SeedSpec[] = [
  {
    releaseKey: "nike-pegasus:Pegasus 41",
    weightOzMen: "9.9",
    heelStackMm: 37,
    forefootStackMm: 27,
    dropMm: 10,
    fitNotes: "True to size for most runners, medium forefoot volume.",
  },
  {
    releaseKey: "saucony-endorphin-speed:Endorphin Speed 4",
    weightOzMen: "8.2",
    heelStackMm: 36,
    forefootStackMm: 28,
    dropMm: 8,
    fitNotes: "Performance fit with secure midfoot and moderate toe box width.",
  },
  {
    releaseKey: "hoka-mach:Mach 6",
    weightOzMen: "8.2",
    heelStackMm: 37,
    forefootStackMm: 32,
    dropMm: 5,
    fitNotes: "Sleeker upper than classic max-cushion Hokas, medium width overall.",
  },
];

export const seedReviewSources: SeedReviewSource[] = [
  {
    name: "RoadTrailRun",
    slug: "roadtrailrun",
    sourceType: "editorial",
    siteUrl: "https://www.roadtrailrun.com",
    baseDomain: "roadtrailrun.com",
  },
  {
    name: "Believe in the Run",
    slug: "believe-in-the-run",
    sourceType: "editorial",
    siteUrl: "https://believeintherun.com",
    baseDomain: "believeintherun.com",
  },
  {
    name: "r/RunningShoeGeeks",
    slug: "reddit-running-shoe-geeks",
    sourceType: "reddit",
    siteUrl: "https://www.reddit.com/r/RunningShoeGeeks/",
    baseDomain: "reddit.com",
  },
];
