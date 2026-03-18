"use client";

import { useId, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface CompareOption {
  id: string;
  label: string;
  detail: string;
  searchLabel: string;
}

interface CompareSelectorProps {
  options: CompareOption[];
  selectedIds: string[];
}

const MAX_SLOTS = 4;

export function CompareSelector({ options, selectedIds }: CompareSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const datalistId = useId();
  const [slots, setSlots] = useState(() => buildInitialSlots(options, selectedIds));
  const [error, setError] = useState<string | null>(null);

  function updateSlot(index: number, value: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, inputValue: value } : slot
      )
    );
  }

  function addSlot() {
    setSlots((current) =>
      current.length >= MAX_SLOTS ? current : [...current, { inputValue: "" }]
    );
  }

  function removeSlot(index: number) {
    setSlots((current) => {
      if (current.length <= 2) {
        return current;
      }

      return current.filter((_, slotIndex) => slotIndex !== index);
    });
  }

  function submitComparison(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolvedIds = slots
      .map((slot) => findOptionId(options, slot.inputValue))
      .filter((value): value is string => Boolean(value));

    const uniqueIds = Array.from(new Set(resolvedIds));

    if (uniqueIds.length < 2) {
      setError("Pick at least two releases to compare.");
      return;
    }

    setError(null);
    const params = new URLSearchParams();
    uniqueIds.slice(0, MAX_SLOTS).forEach((releaseId) => params.append("release", releaseId));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="filter-shell compare-selector-shell">
      <div className="compare-selector-intro">
        <div>
          <p className="feature-kicker">Choose Releases</p>
          <h2>Compare the exact versions you are considering.</h2>
          <p className="catalog-copy">
            Search by brand, model, or release year. Start with two shoes, then add a third or
            fourth only if it helps the decision.
          </p>
        </div>
        <div className="detail-chip-row">
          {selectedIds.length ? (
            <span className="pill">{selectedIds.length} selected</span>
          ) : (
            <span className="pill">Start with two releases</span>
          )}
        </div>
      </div>

      <form className="compare-selector-form" onSubmit={submitComparison}>
        <div className="compare-slot-grid">
          {slots.map((slot, index) => (
            <label className="compare-slot-card" key={`${index}-${slot.inputValue}`}>
              <span className="compare-slot-label">
                {index === 0 ? "First release" : index === 1 ? "Second release" : `Option ${index + 1}`}
              </span>
              <input
                className="compare-slot-input"
                list={datalistId}
                onChange={(event) => updateSlot(index, event.target.value)}
                placeholder="Search brand, shoe, or release"
                type="search"
                value={slot.inputValue}
              />
              <span className="compare-slot-hint">
                {findOptionDetail(options, slot.inputValue) ?? "Type to search the catalog"}
              </span>
              {index >= 2 ? (
                <button
                  className="text-link text-link--compact"
                  onClick={() => removeSlot(index)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </label>
          ))}
        </div>

        <datalist id={datalistId}>
          {options.map((option) => (
            <option key={option.id} value={option.searchLabel} />
          ))}
        </datalist>

        <div className="compare-selector-actions">
          <div className="detail-chip-row">
            {slots.length < MAX_SLOTS ? (
              <button className="button-secondary" onClick={addSlot} type="button">
                Add another release
              </button>
            ) : null}
            <button className="button-primary" type="submit">
              Compare releases
            </button>
          </div>
          <a className="text-link text-link--compact" href="/compare">
            Reset
          </a>
        </div>
        {error ? <p className="detail-muted">{error}</p> : null}
      </form>
    </section>
  );
}

function buildInitialSlots(options: CompareOption[], selectedIds: string[]) {
  const initial = selectedIds
    .slice(0, MAX_SLOTS)
    .map((id) => options.find((option) => option.id === id)?.searchLabel ?? "");

  while (initial.length < 2) {
    initial.push("");
  }

  return initial.map((inputValue) => ({ inputValue }));
}

function findOptionId(options: CompareOption[], inputValue: string) {
  const normalized = inputValue.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = options.find((option) => option.searchLabel.toLowerCase() === normalized);
  if (exact) {
    return exact.id;
  }

  const partial = options.find((option) => option.searchLabel.toLowerCase().includes(normalized));
  return partial?.id ?? null;
}

function findOptionDetail(options: CompareOption[], inputValue: string) {
  const normalized = inputValue.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exact = options.find((option) => option.searchLabel.toLowerCase() === normalized);
  if (exact) {
    return exact.detail;
  }

  const partial = options.find((option) => option.searchLabel.toLowerCase().includes(normalized));
  return partial?.detail ?? null;
}
