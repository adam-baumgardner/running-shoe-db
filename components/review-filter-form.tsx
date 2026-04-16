"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ReviewsFeedData, ReviewsFeedFilters } from "@/lib/server/catalog";

interface ReviewFilterFormProps {
  filters: ReviewsFeedFilters;
  filterOptions: ReviewsFeedData["filterOptions"];
}

export function ReviewFilterForm({ filters, filterOptions }: ReviewFilterFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const releaseSelectRef = useRef<HTMLSelectElement>(null);
  const visibleReleases = filters.shoe
    ? filterOptions.releases.filter((release) => release.shoeSlug === filters.shoe)
    : [];
  const selectedReleaseIsValid = visibleReleases.some((release) => release.slug === filters.release);

  function submitFilters() {
    formRef.current?.requestSubmit();
  }

  function submitShoeChange() {
    if (releaseSelectRef.current) {
      releaseSelectRef.current.value = "";
    }

    submitFilters();
  }

  return (
    <form className="review-filter-form" action="/reviews" ref={formRef}>
      <label className="filter-field">
        <span>Brand</span>
        <select defaultValue={filters.brand ?? ""} name="brand" onChange={submitFilters}>
          <option value="">All brands</option>
          {filterOptions.brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Shoe</span>
        <select defaultValue={filters.shoe ?? ""} name="shoe" onChange={submitShoeChange}>
          <option value="">All shoes</option>
          {filterOptions.shoes.map((shoe) => (
            <option key={shoe.slug} value={shoe.slug}>
              {shoe.brand} {shoe.label}
            </option>
          ))}
        </select>
      </label>
      {filters.shoe ? (
        <label className="filter-field">
          <span>Release</span>
          <select
            defaultValue={selectedReleaseIsValid ? filters.release : ""}
            name="release"
            onChange={submitFilters}
            ref={releaseSelectRef}
          >
            <option value="">All releases</option>
            {visibleReleases.map((release) => (
              <option key={`${release.shoeSlug}:${release.slug}`} value={release.slug}>
                {release.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="filter-field">
        <span>Review source</span>
        <select defaultValue={filters.source ?? ""} name="source" onChange={submitFilters}>
          <option value="">All sources</option>
          {filterOptions.sources.map((source) => (
            <option key={source.slug} value={source.slug}>
              {source.name}
            </option>
          ))}
        </select>
      </label>
      <div className="catalog-toolbar-actions">
        <button className="button-primary" type="submit">
          Apply
        </button>
        <Link className="button-secondary" href="/reviews">
          Reset
        </Link>
      </div>
    </form>
  );
}
