import Link from "next/link";
import type { CatalogFilters, CatalogPageData } from "@/lib/server/catalog";

interface CatalogFilterBarProps {
  filters: CatalogFilters;
  options: CatalogPageData["filterOptions"];
}

export function CatalogFilterBar({ filters, options }: CatalogFilterBarProps) {
  return (
    <section className="filter-shell" aria-label="Catalog filters">
      <form className="filter-grid" action="/shoes">
        <label className="filter-field">
          <span>Search</span>
          <input defaultValue={filters.q ?? ""} name="q" placeholder="Pegasus, daily, plated..." />
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
        <div className="filter-actions">
          <button className="button-primary" type="submit">
            Apply filters
          </button>
          <Link className="button-secondary" href="/shoes">
            Reset
          </Link>
        </div>
      </form>
    </section>
  );
}
