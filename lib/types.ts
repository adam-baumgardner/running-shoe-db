export type ShoeCategory = "road-daily" | "road-workout" | "road-race" | "trail-daily";

export type StabilityType = "neutral" | "stability";

export type ReviewSourceType = "editorial" | "reddit" | "user";

export interface ShoeSummary {
  brand: string;
  name: string;
  category: string;
  rideProfile: string;
  weightOz: number;
  dropMm: number;
}
