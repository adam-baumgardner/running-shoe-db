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

export interface SeedReviewAuthor {
  sourceSlug: string;
  displayName: string;
  profileUrl: string;
}

export interface SeedReview {
  releaseKey: string;
  sourceSlug: string;
  authorName: string;
  sourceUrl: string;
  title: string;
  excerpt: string;
  scoreNormalized100: number;
  originalScoreValue: string;
  originalScoreScale: string;
  sentiment: "positive" | "mixed" | "negative";
  status: "pending" | "approved" | "rejected" | "flagged";
  publishedAt: string;
}

export interface SeedCrawlSource {
  reviewSourceSlug: string;
  importerKey: string;
  targetType: "search" | "listing" | "api";
  targetUrl: string;
  searchPattern: string;
  cadenceLabel: string;
  notes: string;
}

export const seedBrands: SeedBrand[] = [
  { name: "Nike", slug: "nike", websiteUrl: "https://www.nike.com" },
  { name: "Saucony", slug: "saucony", websiteUrl: "https://www.saucony.com" },
  { name: "Hoka", slug: "hoka", websiteUrl: "https://www.hoka.com" },
  { name: "Brooks", slug: "brooks", websiteUrl: "https://www.brooksrunning.com" },
  { name: "ASICS", slug: "asics", websiteUrl: "https://www.asics.com" },
  { name: "New Balance", slug: "new-balance", websiteUrl: "https://www.newbalance.com" },
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
    brandSlug: "nike",
    name: "Vomero",
    slug: "nike-vomero",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Max-cushion daily training for runners who want plush comfort and a smooth rocker.",
  },
  {
    brandSlug: "nike",
    name: "Alphafly",
    slug: "nike-alphafly",
    category: "road-race",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Top-end road racing for marathon and half marathon efforts at goal pace.",
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
    brandSlug: "saucony",
    name: "Triumph",
    slug: "saucony-triumph",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Premium daily mileage and recovery comfort with a soft, high-stack ride.",
  },
  {
    brandSlug: "saucony",
    name: "Ride",
    slug: "saucony-ride",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Versatile everyday trainer built to cover easy runs, errands, and steady mileage.",
  },
  {
    brandSlug: "saucony",
    name: "Guide",
    slug: "saucony-guide",
    category: "road-daily",
    stability: "stability",
    terrain: "road",
    usageSummary: "Guided daily mileage for runners who want a stable platform without a hard correction feel.",
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
  {
    brandSlug: "brooks",
    name: "Ghost",
    slug: "brooks-ghost",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Dependable neutral daily trainer for easy mileage and all-around consistency.",
  },
  {
    brandSlug: "brooks",
    name: "Glycerin",
    slug: "brooks-glycerin",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Plush daily training built around soft landings and smooth, long-run comfort.",
  },
  {
    brandSlug: "brooks",
    name: "Adrenaline GTS",
    slug: "brooks-adrenaline-gts",
    category: "road-daily",
    stability: "stability",
    terrain: "road",
    usageSummary: "Structured daily training for runners who want support without giving up versatility.",
  },
  {
    brandSlug: "asics",
    name: "GEL-Nimbus",
    slug: "asics-gel-nimbus",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "High-cushion road mileage with a soft, smooth feel for easy and long runs.",
  },
  {
    brandSlug: "asics",
    name: "Novablast",
    slug: "asics-novablast",
    category: "road-workout",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Energetic daily training for runners who want bounce and faster turnover.",
  },
  {
    brandSlug: "new-balance",
    name: "Fresh Foam X 1080",
    slug: "new-balance-1080",
    category: "road-daily",
    stability: "neutral",
    terrain: "road",
    usageSummary: "Soft everyday road mileage with a smooth rocker and broad comfort range.",
  },
];

export const seedReleases: SeedRelease[] = [
  {
    shoeSlug: "nike-pegasus",
    versionName: "Pegasus 40",
    releaseYear: 2023,
    msrpUsd: "130.00",
    isCurrent: false,
    isPlated: false,
    foam: "React",
    notes: "Prior-generation daily trainer with the familiar Pegasus fit and a firmer ride than Pegasus 41.",
  },
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
    shoeSlug: "nike-vomero",
    versionName: "Vomero 18",
    releaseYear: 2025,
    msrpUsd: "150.00",
    isCurrent: true,
    isPlated: false,
    foam: "ZoomX + ReactX",
    notes: "Maximum-cushion road trainer with a high stack and soft rocker for easy mileage.",
  },
  {
    shoeSlug: "nike-alphafly",
    versionName: "Alphafly 3",
    releaseYear: 2024,
    msrpUsd: "285.00",
    isCurrent: true,
    isPlated: true,
    foam: "ZoomX",
    notes: "Elite road racing shoe with a carbon plate, aggressive rocker, and Air Zoom pods.",
  },
  {
    shoeSlug: "saucony-endorphin-speed",
    versionName: "Endorphin Speed 3",
    releaseYear: 2023,
    msrpUsd: "170.00",
    isCurrent: false,
    isPlated: true,
    foam: "PWRRUN PB",
    notes: "Earlier versatile plated trainer with a broad fan base across workouts and long runs.",
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
    shoeSlug: "saucony-triumph",
    versionName: "Triumph 21",
    releaseYear: 2023,
    msrpUsd: "160.00",
    isCurrent: false,
    isPlated: false,
    foam: "PWRRUN+",
    notes: "Prior Triumph generation built around soft long-run comfort and premium upper feel.",
  },
  {
    shoeSlug: "saucony-triumph",
    versionName: "Triumph 22",
    releaseYear: 2024,
    msrpUsd: "160.00",
    isCurrent: true,
    isPlated: false,
    foam: "PWRRUN PB",
    notes: "Plusher premium trainer that moves the Triumph line toward a softer, bouncier ride.",
  },
  {
    shoeSlug: "saucony-ride",
    versionName: "Ride 17",
    releaseYear: 2024,
    msrpUsd: "140.00",
    isCurrent: false,
    isPlated: false,
    foam: "PWRRUN+",
    notes: "Previous Ride version with a versatile daily profile and softer transition than older rides.",
  },
  {
    shoeSlug: "saucony-ride",
    versionName: "Ride 18",
    releaseYear: 2025,
    msrpUsd: "140.00",
    isCurrent: true,
    isPlated: false,
    foam: "PWRRUN+",
    notes: "Do-it-all daily trainer with lighter foam and stronger all-day versatility.",
  },
  {
    shoeSlug: "saucony-guide",
    versionName: "Guide 18",
    releaseYear: 2025,
    msrpUsd: "140.00",
    isCurrent: true,
    isPlated: false,
    foam: "PWRRUN",
    notes: "Stable daily trainer with a broad platform and CenterPath guidance.",
  },
  {
    shoeSlug: "hoka-mach",
    versionName: "Mach 5",
    releaseYear: 2023,
    msrpUsd: "140.00",
    isCurrent: false,
    isPlated: false,
    foam: "PROFLY+",
    notes: "Previous lightweight trainer known for its soft-meets-snappy ride and easy turnover.",
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
  {
    shoeSlug: "brooks-ghost",
    versionName: "Ghost 16",
    releaseYear: 2024,
    msrpUsd: "140.00",
    isCurrent: false,
    isPlated: false,
    foam: "DNA Loft v3",
    notes: "Reliable neutral trainer with a familiar 12mm drop and broad daily-run appeal.",
  },
  {
    shoeSlug: "brooks-ghost",
    versionName: "Ghost 17",
    releaseYear: 2025,
    msrpUsd: "150.00",
    isCurrent: true,
    isPlated: false,
    foam: "DNA Loft v3",
    notes: "Current Ghost with slightly more underfoot cushioning and the same dependable training role.",
  },
  {
    shoeSlug: "brooks-glycerin",
    versionName: "Glycerin 22",
    releaseYear: 2025,
    msrpUsd: "165.00",
    isCurrent: true,
    isPlated: false,
    foam: "DNA Tuned",
    notes: "Premium cushioned trainer with plush landings and a smoother, broader platform.",
  },
  {
    shoeSlug: "brooks-adrenaline-gts",
    versionName: "Adrenaline GTS 24",
    releaseYear: 2024,
    msrpUsd: "140.00",
    isCurrent: true,
    isPlated: false,
    foam: "DNA Loft v3",
    notes: "Structured daily trainer using GuideRails support for steady mileage.",
  },
  {
    shoeSlug: "asics-gel-nimbus",
    versionName: "GEL-Nimbus 26",
    releaseYear: 2024,
    msrpUsd: "160.00",
    isCurrent: false,
    isPlated: false,
    foam: "FF BLAST PLUS ECO",
    notes: "High-cushion road trainer with soft landings and an easy-mileage emphasis.",
  },
  {
    shoeSlug: "asics-gel-nimbus",
    versionName: "GEL-Nimbus 27",
    releaseYear: 2025,
    msrpUsd: "165.00",
    isCurrent: true,
    isPlated: false,
    foam: "FF BLAST PLUS",
    notes: "Soft max-cushion road trainer tuned for smooth daily mileage and long runs.",
  },
  {
    shoeSlug: "asics-novablast",
    versionName: "Novablast 5",
    releaseYear: 2024,
    msrpUsd: "150.00",
    isCurrent: true,
    isPlated: false,
    foam: "FF BLAST MAX",
    notes: "Bouncy trainer built around a lively toe-off and quicker daily running.",
  },
  {
    shoeSlug: "new-balance-1080",
    versionName: "Fresh Foam X 1080v13",
    releaseYear: 2023,
    msrpUsd: "164.99",
    isCurrent: false,
    isPlated: false,
    foam: "Fresh Foam X",
    notes: "Previous 1080 version centered on soft comfort and broad daily versatility.",
  },
  {
    shoeSlug: "new-balance-1080",
    versionName: "Fresh Foam X 1080v14",
    releaseYear: 2024,
    msrpUsd: "164.99",
    isCurrent: true,
    isPlated: false,
    foam: "Fresh Foam X",
    notes: "Current 1080 with a smoother rocker and extra-soft everyday road comfort.",
  },
];

export const seedSpecs: SeedSpec[] = [
  {
    releaseKey: "nike-pegasus:Pegasus 40",
    weightOzMen: "9.4",
    heelStackMm: 36,
    forefootStackMm: 26,
    dropMm: 10,
    fitNotes: "Classic Pegasus fit with moderate forefoot room and easy sizing for most runners.",
  },
  {
    releaseKey: "nike-pegasus:Pegasus 41",
    weightOzMen: "9.9",
    heelStackMm: 37,
    forefootStackMm: 27,
    dropMm: 10,
    fitNotes: "True to size for most runners, medium forefoot volume.",
  },
  {
    releaseKey: "nike-vomero:Vomero 18",
    weightOzMen: "11.5",
    heelStackMm: 46,
    forefootStackMm: 36,
    dropMm: 10,
    fitNotes: "Plush upper with broad everyday comfort and a more substantial fit than Pegasus.",
  },
  {
    releaseKey: "nike-alphafly:Alphafly 3",
    weightOzMen: "7.7",
    heelStackMm: 40,
    forefootStackMm: 32,
    dropMm: 8,
    fitNotes: "Race-day fit with a secure midfoot and a more dialed-in forefoot than max trainers.",
  },
  {
    releaseKey: "saucony-endorphin-speed:Endorphin Speed 3",
    weightOzMen: "8.1",
    heelStackMm: 36,
    forefootStackMm: 28,
    dropMm: 8,
    fitNotes: "Performance-oriented upper with secure heel hold and moderate forefoot width.",
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
    releaseKey: "saucony-triumph:Triumph 21",
    weightOzMen: "9.8",
    heelStackMm: 37,
    forefootStackMm: 27,
    dropMm: 10,
    fitNotes: "Roomy daily-trainer fit with solid heel hold and long-run comfort focus.",
  },
  {
    releaseKey: "saucony-triumph:Triumph 22",
    weightOzMen: "10.1",
    heelStackMm: 37,
    forefootStackMm: 27,
    dropMm: 10,
    fitNotes: "Premium upper and softer platform make this one comfortable without feeling sloppy.",
  },
  {
    releaseKey: "saucony-ride:Ride 17",
    weightOzMen: "9.4",
    heelStackMm: 35,
    forefootStackMm: 27,
    dropMm: 8,
    fitNotes: "Straightforward neutral fit with enough space for daily miles and all-day wear.",
  },
  {
    releaseKey: "saucony-ride:Ride 18",
    weightOzMen: "9.1",
    heelStackMm: 35,
    forefootStackMm: 27,
    dropMm: 8,
    fitNotes: "Easy, adaptable fit with enough room for regular training and casual wear overlap.",
  },
  {
    releaseKey: "saucony-guide:Guide 18",
    weightOzMen: "9.6",
    heelStackMm: 35,
    forefootStackMm: 29,
    dropMm: 6,
    fitNotes: "Secure heel and broad base underfoot create a stable, protected daily fit.",
  },
  {
    releaseKey: "hoka-mach:Mach 5",
    weightOzMen: "8.3",
    heelStackMm: 29,
    forefootStackMm: 24,
    dropMm: 5,
    fitNotes: "Sleek upper and moderate toe box keep the fit performance-oriented but not harsh.",
  },
  {
    releaseKey: "hoka-mach:Mach 6",
    weightOzMen: "8.2",
    heelStackMm: 37,
    forefootStackMm: 32,
    dropMm: 5,
    fitNotes: "Sleeker upper than classic max-cushion Hokas, medium width overall.",
  },
  {
    releaseKey: "brooks-ghost:Ghost 16",
    weightOzMen: "9.5",
    heelStackMm: 36,
    forefootStackMm: 24,
    dropMm: 12,
    fitNotes: "Classic Brooks daily fit with broad appeal, especially for heel strikers.",
  },
  {
    releaseKey: "brooks-ghost:Ghost 17",
    weightOzMen: "10.1",
    heelStackMm: 37,
    forefootStackMm: 27,
    dropMm: 10,
    fitNotes: "Comfortable neutral fit with a familiar Brooks shape and a little more cushioning than Ghost 16.",
  },
  {
    releaseKey: "brooks-glycerin:Glycerin 22",
    weightOzMen: "10.2",
    heelStackMm: 38,
    forefootStackMm: 28,
    dropMm: 10,
    fitNotes: "Premium upper and broad platform create a plush fit for long easy runs.",
  },
  {
    releaseKey: "brooks-adrenaline-gts:Adrenaline GTS 24",
    weightOzMen: "10.1",
    heelStackMm: 36,
    forefootStackMm: 24,
    dropMm: 12,
    fitNotes: "Structured feel with Brooks' familiar fit profile and easy transition into daily support use.",
  },
  {
    releaseKey: "asics-gel-nimbus:GEL-Nimbus 26",
    weightOzMen: "10.7",
    heelStackMm: 42,
    forefootStackMm: 34,
    dropMm: 8,
    fitNotes: "Soft, padded upper with a premium daily-training fit and strong long-run comfort.",
  },
  {
    releaseKey: "asics-gel-nimbus:GEL-Nimbus 27",
    weightOzMen: "9.3",
    heelStackMm: 44,
    forefootStackMm: 36,
    dropMm: 8,
    fitNotes: "Very cushioned, soft-fitting upper with plenty of comfort for easy road mileage.",
  },
  {
    releaseKey: "asics-novablast:Novablast 5",
    weightOzMen: "9.0",
    heelStackMm: 42,
    forefootStackMm: 34,
    dropMm: 8,
    fitNotes: "Flexible upper with a comfortable midfoot hold and room for faster daily efforts.",
  },
  {
    releaseKey: "new-balance-1080:Fresh Foam X 1080v13",
    weightOzMen: "9.3",
    heelStackMm: 38,
    forefootStackMm: 32,
    dropMm: 6,
    fitNotes: "Soft upper and balanced toe box make it easy to wear for long easy days.",
  },
  {
    releaseKey: "new-balance-1080:Fresh Foam X 1080v14",
    weightOzMen: "10.5",
    heelStackMm: 38,
    forefootStackMm: 32,
    dropMm: 6,
    fitNotes: "Smooth rocker and forgiving upper create an easygoing fit for everyday miles.",
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
  {
    name: "RunRepeat",
    slug: "runrepeat",
    sourceType: "editorial",
    siteUrl: "https://runrepeat.com",
    baseDomain: "runrepeat.com",
  },
  {
    name: "Doctors of Running",
    slug: "doctors-of-running",
    sourceType: "editorial",
    siteUrl: "https://www.doctorsofrunning.com",
    baseDomain: "doctorsofrunning.com",
  },
];

export const seedReviewAuthors: SeedReviewAuthor[] = [
  {
    sourceSlug: "roadtrailrun",
    displayName: "RTR Editorial",
    profileUrl: "https://www.roadtrailrun.com",
  },
  {
    sourceSlug: "believe-in-the-run",
    displayName: "BITR Team",
    profileUrl: "https://believeintherun.com",
  },
  {
    sourceSlug: "reddit-running-shoe-geeks",
    displayName: "strideforum",
    profileUrl: "https://www.reddit.com/user/strideforum/",
  },
  {
    sourceSlug: "runrepeat",
    displayName: "RunRepeat Editorial",
    profileUrl: "https://runrepeat.com",
  },
  {
    sourceSlug: "doctors-of-running",
    displayName: "Doctors of Running",
    profileUrl: "https://www.doctorsofrunning.com",
  },
];

export const seedReviews: SeedReview[] = [
  {
    releaseKey: "nike-pegasus:Pegasus 40",
    sourceSlug: "reddit-running-shoe-geeks",
    authorName: "strideforum",
    sourceUrl: "https://example.com/reviews/nike-pegasus-40-reddit-thread",
    title: "Pegasus 40 remains a safe pick for everyday road mileage",
    excerpt:
      "Community sentiment leans positive on durability and familiarity, with more mixed comments on excitement compared to newer super-trainers.",
    scoreNormalized100: 76,
    originalScoreValue: "7.6",
    originalScoreScale: "10",
    sentiment: "mixed",
    status: "approved",
    publishedAt: "2024-01-08T00:00:00.000Z",
  },
  {
    releaseKey: "nike-pegasus:Pegasus 41",
    sourceSlug: "roadtrailrun",
    authorName: "RTR Editorial",
    sourceUrl: "https://example.com/reviews/nike-pegasus-41-rtr",
    title: "Pegasus 41 stays dependable for daily mileage",
    excerpt:
      "Reviewers liked the familiarity and durability, while noting it does not chase the super-trainer trend.",
    scoreNormalized100: 82,
    originalScoreValue: "8.2",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2024-06-10T00:00:00.000Z",
  },
  {
    releaseKey: "nike-vomero:Vomero 18",
    sourceSlug: "doctors-of-running",
    authorName: "Doctors of Running",
    sourceUrl: "https://example.com/reviews/nike-vomero-18-dor",
    title: "Vomero 18 leans all the way into max-cushion comfort",
    excerpt:
      "Reviewers praise the protective ride and easy-run comfort, with some caution that the shoe is heavy for faster work.",
    scoreNormalized100: 86,
    originalScoreValue: "8.6",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-02-14T00:00:00.000Z",
  },
  {
    releaseKey: "nike-alphafly:Alphafly 3",
    sourceSlug: "runrepeat",
    authorName: "RunRepeat Editorial",
    sourceUrl: "https://example.com/reviews/nike-alphafly-3-runrepeat",
    title: "Alphafly 3 is still one of the sharpest race-day tools",
    excerpt:
      "Coverage remains strongly positive on efficiency and turnover, though fit and stability comments are more selective than daily trainers.",
    scoreNormalized100: 94,
    originalScoreValue: "9.4",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-01-10T00:00:00.000Z",
  },
  {
    releaseKey: "saucony-endorphin-speed:Endorphin Speed 3",
    sourceSlug: "reddit-running-shoe-geeks",
    authorName: "strideforum",
    sourceUrl: "https://example.com/reviews/endorphin-speed-3-reddit-thread",
    title: "Endorphin Speed 3 stayed a community favorite for mixed training",
    excerpt:
      "Users consistently liked the versatility, with only occasional complaints about upper fit and late-run stability.",
    scoreNormalized100: 88,
    originalScoreValue: "8.8",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2024-02-22T00:00:00.000Z",
  },
  {
    releaseKey: "saucony-endorphin-speed:Endorphin Speed 4",
    sourceSlug: "believe-in-the-run",
    authorName: "BITR Team",
    sourceUrl: "https://example.com/reviews/endorphin-speed-4-bitr",
    title: "Endorphin Speed 4 remains the versatile fast trainer pick",
    excerpt:
      "The plate and foam combination continues to make it an all-purpose option for tempo work and long runs.",
    scoreNormalized100: 91,
    originalScoreValue: "9.1",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2024-03-04T00:00:00.000Z",
  },
  {
    releaseKey: "saucony-triumph:Triumph 22",
    sourceSlug: "roadtrailrun",
    authorName: "RTR Editorial",
    sourceUrl: "https://example.com/reviews/saucony-triumph-22-rtr",
    title: "Triumph 22 goes softer and bouncier without losing premium comfort",
    excerpt:
      "Editorial reviews like the update in underfoot feel, though some note it is less traditional than earlier Triumph versions.",
    scoreNormalized100: 87,
    originalScoreValue: "8.7",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2024-08-03T00:00:00.000Z",
  },
  {
    releaseKey: "saucony-ride:Ride 18",
    sourceSlug: "runrepeat",
    authorName: "RunRepeat Editorial",
    sourceUrl: "https://example.com/reviews/saucony-ride-18-runrepeat",
    title: "Ride 18 looks like a stronger all-around daily trainer than Ride 17",
    excerpt:
      "The lighter foam and smoother transition are consistent positives, while the shoe is still framed as more practical than flashy.",
    scoreNormalized100: 84,
    originalScoreValue: "8.4",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-01-29T00:00:00.000Z",
  },
  {
    releaseKey: "saucony-guide:Guide 18",
    sourceSlug: "doctors-of-running",
    authorName: "Doctors of Running",
    sourceUrl: "https://example.com/reviews/saucony-guide-18-dor",
    title: "Guide 18 gets credit for stable comfort without harsh posting",
    excerpt:
      "Support-focused reviewers like the broad base and controlled ride, with moderate notes on weight relative to neutral trainers.",
    scoreNormalized100: 83,
    originalScoreValue: "8.3",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-02-05T00:00:00.000Z",
  },
  {
    releaseKey: "hoka-mach:Mach 5",
    sourceSlug: "roadtrailrun",
    authorName: "RTR Editorial",
    sourceUrl: "https://example.com/reviews/hoka-mach-5-rtr",
    title: "Mach 5 stayed a favorite for lightweight everyday uptempo running",
    excerpt:
      "Reviewers liked its quick turnover and low-friction ride, with durability mentioned as the main caution.",
    scoreNormalized100: 85,
    originalScoreValue: "8.5",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2024-01-17T00:00:00.000Z",
  },
  {
    releaseKey: "hoka-mach:Mach 6",
    sourceSlug: "reddit-running-shoe-geeks",
    authorName: "strideforum",
    sourceUrl: "https://example.com/reviews/hoka-mach-6-reddit-thread",
    title: "Mach 6 gets praise for turnover but mixed comments on long-run comfort",
    excerpt:
      "Community feedback trends positive on pace changes, with more split opinions once runs get longer.",
    scoreNormalized100: 78,
    originalScoreValue: "7.8",
    originalScoreScale: "10",
    sentiment: "mixed",
    status: "approved",
    publishedAt: "2024-04-18T00:00:00.000Z",
  },
  {
    releaseKey: "brooks-ghost:Ghost 17",
    sourceSlug: "roadtrailrun",
    authorName: "RTR Editorial",
    sourceUrl: "https://example.com/reviews/brooks-ghost-17-rtr",
    title: "Ghost 17 stays practical while adding a little more cushion",
    excerpt:
      "The tone is positive on consistency and comfort, with the usual note that Ghost is more dependable than exciting.",
    scoreNormalized100: 81,
    originalScoreValue: "8.1",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-03-12T00:00:00.000Z",
  },
  {
    releaseKey: "brooks-glycerin:Glycerin 22",
    sourceSlug: "believe-in-the-run",
    authorName: "BITR Team",
    sourceUrl: "https://example.com/reviews/brooks-glycerin-22-bitr",
    title: "Glycerin 22 pushes the line further toward plush premium mileage",
    excerpt:
      "Reviewers tend to like the softness and smoothness, while noting that runners wanting more pop may look elsewhere.",
    scoreNormalized100: 88,
    originalScoreValue: "8.8",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-02-20T00:00:00.000Z",
  },
  {
    releaseKey: "brooks-adrenaline-gts:Adrenaline GTS 24",
    sourceSlug: "reddit-running-shoe-geeks",
    authorName: "strideforum",
    sourceUrl: "https://example.com/reviews/brooks-adrenaline-gts-24-reddit-thread",
    title: "Adrenaline GTS 24 stays in the reliable support lane",
    excerpt:
      "Community sentiment sees it as trustworthy and stable, though less appealing to runners chasing lighter and faster-feeling options.",
    scoreNormalized100: 79,
    originalScoreValue: "7.9",
    originalScoreScale: "10",
    sentiment: "mixed",
    status: "approved",
    publishedAt: "2024-09-02T00:00:00.000Z",
  },
  {
    releaseKey: "asics-gel-nimbus:GEL-Nimbus 27",
    sourceSlug: "runrepeat",
    authorName: "RunRepeat Editorial",
    sourceUrl: "https://example.com/reviews/asics-gel-nimbus-27-runrepeat",
    title: "Nimbus 27 doubles down on soft comfort for easy mileage",
    excerpt:
      "Coverage is consistently positive on softness and protection, with only the usual caveat that it is not meant to feel quick.",
    scoreNormalized100: 89,
    originalScoreValue: "8.9",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-01-24T00:00:00.000Z",
  },
  {
    releaseKey: "asics-novablast:Novablast 5",
    sourceSlug: "doctors-of-running",
    authorName: "Doctors of Running",
    sourceUrl: "https://example.com/reviews/asics-novablast-5-dor",
    title: "Novablast 5 gets praise for bounce and daily versatility",
    excerpt:
      "The ride is generally reviewed as energetic and fun, with some caution that it can feel unstable for runners wanting more guidance.",
    scoreNormalized100: 86,
    originalScoreValue: "8.6",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2025-01-08T00:00:00.000Z",
  },
  {
    releaseKey: "new-balance-1080:Fresh Foam X 1080v14",
    sourceSlug: "believe-in-the-run",
    authorName: "BITR Team",
    sourceUrl: "https://example.com/reviews/new-balance-1080v14-bitr",
    title: "1080v14 remains one of the cleaner mainstream comfort trainers",
    excerpt:
      "Reviewers like the smooth rocker and broad comfort range, with some noting it is softer than runners wanting firmer feedback may prefer.",
    scoreNormalized100: 87,
    originalScoreValue: "8.7",
    originalScoreScale: "10",
    sentiment: "positive",
    status: "approved",
    publishedAt: "2024-11-18T00:00:00.000Z",
  },
];

export const seedCrawlSources: SeedCrawlSource[] = [
  {
    reviewSourceSlug: "believe-in-the-run",
    importerKey: "believe-in-the-run",
    targetType: "search",
    targetUrl: "https://believeintherun.com/",
    searchPattern: "{shoe_name}",
    cadenceLabel: "daily",
    notes: "Search site content for shoe model names and capture matching editorial reviews.",
  },
  {
    reviewSourceSlug: "reddit-running-shoe-geeks",
    importerKey: "reddit-running-shoe-geeks",
    targetType: "search",
    targetUrl: "https://www.reddit.com/r/RunningShoeGeeks/",
    searchPattern: "{shoe_name}",
    cadenceLabel: "twice-daily",
    notes: "Search subreddit threads and comments for shoe model sentiment and review discussions.",
  },
  {
    reviewSourceSlug: "runrepeat",
    importerKey: "runrepeat",
    targetType: "search",
    targetUrl: "https://runrepeat.com/catalog/search",
    searchPattern: "{brand_name} {shoe_name}",
    cadenceLabel: "manual",
    notes: "Planned importer for structured review and spec extraction from RunRepeat.",
  },
  {
    reviewSourceSlug: "doctors-of-running",
    importerKey: "doctors-of-running",
    targetType: "search",
    targetUrl: "https://www.doctorsofrunning.com/search",
    searchPattern: "{brand_name} {shoe_name}",
    cadenceLabel: "manual",
    notes: "Planned importer for long-form editorial reviews from Doctors of Running.",
  },
];
