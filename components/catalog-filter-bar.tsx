import Link from "next/link";
import type { CatalogFilters, CatalogPageData } from "@/lib/server/catalog";

interface CatalogFilterBarProps {
  filters: CatalogFilters;
  options: CatalogPageData["filterOptions"];
  activeFilters: CatalogPageData["activeFilters"];
}

const RESET_FILTER_KEYS = new Set([
  "q",
  "brand",
  "minReleaseYear",
  "maxReleaseYear",
  "category",
  "terrain",
  "stability",
  "plated",
  "current",
  "minPrice",
  "maxPrice",
  "minWeight",
  "maxWeight",
  "cushionLevel",
  "minHeelStack",
  "maxHeelStack",
  "minForefootStack",
  "maxForefootStack",
  "minDrop",
  "maxDrop",
  "minReviewScore",
  "minReviewCount",
  "sort",
  "direction",
]);

export function CatalogFilterBar({ filters, options, activeFilters }: CatalogFilterBarProps) {
  return (
    <section className="filter-shell" aria-label="Catalog controls">
      <form className="catalog-toolbar" action="/shoes">
        <div className="catalog-toolbar-main">
          <label className="filter-field catalog-toolbar-search">
            <span>Search</span>
            <input defaultValue={filters.q ?? ""} name="q" placeholder="Pegasus, daily, plated..." />
          </label>
          <label className="filter-field catalog-toolbar-field">
            <span>Brand</span>
            <select defaultValue={filters.brand ?? ""} name="brand">
              <option value="">All brands</option>
              {options.brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field catalog-toolbar-field">
            <span>Sort by</span>
            <select defaultValue={getSortValue(filters)} name="sort">
              <option value="latest">Newest releases</option>
              <option value="oldest">Oldest releases</option>
              <option value="brand-a-z">Brand: A to Z</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="weight-light">Weight: lightest first</option>
              <option value="weight-heavy">Weight: heaviest first</option>
              <option value="drop-low">Drop: lowest first</option>
              <option value="drop-high">Drop: highest first</option>
              <option value="review-score">Review score: high to low</option>
              <option value="most-reviewed">Most reviewed</option>
            </select>
          </label>
          <div className="catalog-toolbar-actions">
            <button className="button-primary" type="submit">
              Apply
            </button>
            <Link className="button-secondary" href="/shoes">
              Reset
            </Link>
          </div>
        </div>
        <details className="catalog-filter-panel catalog-filter-panel--full">
          <summary>Filters</summary>
          <div className="catalog-filter-panel-body">
            <div className="filter-grid filter-grid--catalog">
              <label className="filter-field">
                <span>Min release year</span>
                <input
                  defaultValue={filters.minReleaseYear ?? ""}
                  name="minReleaseYear"
                  type="number"
                  min="2000"
                  step="1"
                />
              </label>
              <label className="filter-field">
                <span>Max release year</span>
                <input
                  defaultValue={filters.maxReleaseYear ?? ""}
                  name="maxReleaseYear"
                  type="number"
                  min="2000"
                  step="1"
                />
              </label>
              <label className="filter-field">
                <span>Category</span>
                <select defaultValue={filters.category ?? ""} name="category">
                  <option value="">All categories</option>
                  {options.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Terrain</span>
                <select defaultValue={filters.terrain ?? ""} name="terrain">
                  <option value="">All terrain</option>
                  {options.terrains.map((terrain) => (
                    <option key={terrain} value={terrain}>
                      {terrain}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Stability</span>
                <select defaultValue={filters.stability ?? ""} name="stability">
                  <option value="">All stability</option>
                  {options.stabilities.map((stability) => (
                    <option key={stability} value={stability}>
                      {stability}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Plate</span>
                <select defaultValue={filters.plated ?? ""} name="plated">
                  <option value="">Any</option>
                  <option value="plated">Plated</option>
                  <option value="non-plated">Non-plated</option>
                </select>
              </label>
              <label className="filter-field">
                <span>Current models</span>
                <select defaultValue={filters.current ?? ""} name="current">
                  <option value="">All releases</option>
                  <option value="current">Current only</option>
                </select>
              </label>
              <label className="filter-field">
                <span>Min MSRP</span>
                <input defaultValue={filters.minPrice ?? ""} name="minPrice" type="number" min="0" step="1" />
              </label>
              <label className="filter-field">
                <span>Max MSRP</span>
                <input defaultValue={filters.maxPrice ?? ""} name="maxPrice" type="number" min="0" step="1" />
              </label>
              <label className="filter-field">
                <span>Min weight (oz)</span>
                <input defaultValue={filters.minWeight ?? ""} name="minWeight" type="number" min="0" step="0.1" />
              </label>
              <label className="filter-field">
                <span>Max weight (oz)</span>
                <input defaultValue={filters.maxWeight ?? ""} name="maxWeight" type="number" min="0" step="0.1" />
              </label>
              <label className="filter-field">
                <span>Cushion level</span>
                <select defaultValue={filters.cushionLevel ?? ""} name="cushionLevel">
                  <option value="">Any</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="max">Max</option>
                </select>
              </label>
              <label className="filter-field">
                <span>Min drop</span>
                <input defaultValue={filters.minDrop ?? ""} name="minDrop" type="number" min="0" step="1" />
              </label>
              <label className="filter-field">
                <span>Max drop</span>
                <input defaultValue={filters.maxDrop ?? ""} name="maxDrop" type="number" min="0" step="1" />
              </label>
            </div>
          </div>
        </details>
      </form>

      {activeFilters.length ? (
        <div className="catalog-active-filters">
          {activeFilters.map((filter) => (
            <Link
              key={`${filter.key}:${filter.value}`}
              className="pill pill-link"
              href={buildFilterRemovalHref(filters, filter.key)}
            >
              {filter.label}: {filter.value} ×
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function getSortValue(filters: CatalogFilters) {
  if (filters.sort && !filters.direction) {
    return filters.sort;
  }

  const sort = filters.sort ?? "latest";
  const direction = filters.direction ?? (sort === "brand" ? "asc" : "desc");

  if (sort === "brand") return "brand-a-z";
  if (sort === "price") return direction === "asc" ? "price-low" : "price-high";
  if (sort === "weight") return direction === "asc" ? "weight-light" : "weight-heavy";
  if (sort === "drop") return direction === "asc" ? "drop-low" : "drop-high";
  if (sort === "review-score") return "review-score";
  if (sort === "review-count") return "most-reviewed";
  if (sort === "release-year" || sort === "latest") return direction === "asc" ? "oldest" : "latest";

  return sort;
}

function buildFilterRemovalHref(filters: CatalogFilters, filterKey: string) {
  const params = new URLSearchParams();
  const entries = Object.entries(filters);

  for (const [key, value] of entries) {
    if (!value?.trim()) continue;
    if (key === filterKey) continue;
    if (
      (filterKey === "price" && (key === "minPrice" || key === "maxPrice")) ||
      (filterKey === "release-year" && (key === "minReleaseYear" || key === "maxReleaseYear")) ||
      (filterKey === "weight" && (key === "minWeight" || key === "maxWeight")) ||
      (filterKey === "heel-stack" && (key === "minHeelStack" || key === "maxHeelStack")) ||
      (filterKey === "forefoot-stack" &&
        (key === "minForefootStack" || key === "maxForefootStack")) ||
      (filterKey === "drop" && (key === "minDrop" || key === "maxDrop"))
    ) {
      continue;
    }
    if (RESET_FILTER_KEYS.has(key)) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/shoes?${query}` : "/shoes";
}
