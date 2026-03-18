"use client";

import { startTransition, useState } from "react";
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

interface CompareSlot {
  selectedId: string | null;
}

const MAX_SLOTS = 4;

export function CompareSelector({ options, selectedIds }: CompareSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [slots, setSlots] = useState<CompareSlot[]>(() => buildInitialSlots(selectedIds));
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(0);
  const [query, setQuery] = useState("");

  const resolvedSelectedIds = slots
    .map((slot) => slot.selectedId)
    .filter((value): value is string => Boolean(value));

  const filteredOptions = getFilteredOptions(options, query, resolvedSelectedIds);
  function openSlot(index: number) {
    setActiveSlotIndex(index);
    const selectedId = slots[index]?.selectedId;
    const selectedOption = options.find((option) => option.id === selectedId);
    setQuery(selectedOption?.searchLabel ?? "");
  }

  function selectOption(optionId: string) {
    if (activeSlotIndex === null) {
      return;
    }

    const nextSlots = slots.map((slot, index) =>
      index === activeSlotIndex ? { selectedId: optionId } : slot
    );
    setSlots(nextSlots);
    setActiveSlotIndex(null);
    setQuery("");
    syncSelection(nextSlots);
  }

  function clearSlot(index: number) {
    const nextSlots = slots.map((slot, slotIndex) =>
      slotIndex === index ? { selectedId: null } : slot
    );
    setSlots(nextSlots);
    setActiveSlotIndex(index);
    setQuery("");
    syncSelection(nextSlots);
  }

  function addSlot() {
    if (slots.length >= MAX_SLOTS) {
      return;
    }

    const nextSlots = [...slots, { selectedId: null }];
    setSlots(nextSlots);
    setActiveSlotIndex(nextSlots.length - 1);
    setQuery("");
  }

  function removeSlot(index: number) {
    if (slots.length <= 2) {
      clearSlot(index);
      return;
    }

    const nextSlots = slots.filter((_, slotIndex) => slotIndex !== index);
    setSlots(nextSlots);
    setActiveSlotIndex(null);
    setQuery("");
    syncSelection(nextSlots);
  }

  function syncSelection(nextSlots: CompareSlot[]) {
    const nextIds = Array.from(
      new Set(nextSlots.map((slot) => slot.selectedId).filter((value): value is string => Boolean(value)))
    );

    startTransition(() => {
      if (nextIds.length < 2) {
        router.replace(pathname);
        return;
      }

      const params = new URLSearchParams();
      nextIds.slice(0, MAX_SLOTS).forEach((releaseId) => params.append("release", releaseId));
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <section className="filter-shell compare-selector-shell">
      <div className="compare-selector-intro">
        <div>
          <p className="feature-kicker">Compare Shoes</p>
          <h2>Pick the exact shoes you want side by side.</h2>
          <p className="catalog-copy">
            Search by brand, model, release, or year. As soon as at least two shoes are selected,
            the comparison updates automatically.
          </p>
        </div>
      </div>

      <div className="compare-slot-grid">
        {slots.map((slot, index) => {
          const option = options.find((item) => item.id === slot.selectedId);
          const isActive = index === activeSlotIndex;

          return (
            <div
              className={`compare-slot-card compare-slot-card--picker${isActive ? " compare-slot-card--active" : ""}${option ? " compare-slot-card--filled" : ""}`}
              key={`slot-${index}`}
              onClick={() => openSlot(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openSlot(index);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="compare-slot-label">Shoe #{index + 1}</span>
              {isActive ? (
                <div
                  className="compare-search-panel compare-search-panel--inline"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="compare-search-panel-head">
                    <div>
                      <p className="feature-kicker">Search</p>
                      <h3>Shoe #{index + 1}</h3>
                    </div>
                    <button
                      className="text-link text-link--compact"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveSlotIndex(null);
                        setQuery("");
                      }}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  <input
                    autoFocus
                    className="compare-slot-input"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Try Endorphin, Pegasus, Speedgoat, Vaporfly..."
                    type="search"
                    value={query}
                  />
                  <div className="compare-search-results" role="listbox">
                    {filteredOptions.map((resultOption) => (
                      <button
                        className="compare-search-result"
                        key={resultOption.id}
                        onClick={() => selectOption(resultOption.id)}
                        type="button"
                      >
                        <strong>{resultOption.label}</strong>
                        <span>{resultOption.detail}</span>
                      </button>
                    ))}
                    {!filteredOptions.length ? (
                      <div className="compare-search-empty">
                        <strong>No matching shoes yet.</strong>
                        <span>Try a broader brand, model, or release-year search.</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : option ? (
                <>
                  <strong>{option.label}</strong>
                  <span className="compare-slot-hint">{option.detail}</span>
                  <span className="compare-slot-actions">
                    <span className="text-link text-link--compact">Change</span>
                    <button
                      className="text-link text-link--compact"
                      onClick={(event) => {
                        event.stopPropagation();
                        clearSlot(index);
                      }}
                      type="button"
                    >
                      Clear
                    </button>
                    {index >= 2 ? (
                      <button
                        className="text-link text-link--compact"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeSlot(index);
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    ) : null}
                  </span>
                </>
              ) : (
                <>
                  <span className="compare-slot-plus">+</span>
                  <strong>Add a shoe</strong>
                  <span className="compare-slot-hint">
                    Choose a release to compare against the others.
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="compare-selector-actions">
        {slots.length < MAX_SLOTS ? (
          <button className="button-secondary" onClick={addSlot} type="button">
            Add another shoe
          </button>
        ) : (
          <span className="detail-muted">Up to four shoes can be compared at once.</span>
        )}
        <a className="text-link text-link--compact" href="/compare">
          Reset
        </a>
      </div>
    </section>
  );
}

function buildInitialSlots(selectedIds: string[]) {
  const slots: CompareSlot[] = selectedIds
    .slice(0, MAX_SLOTS)
    .map((selectedId) => ({ selectedId }));

  while (slots.length < 2) {
    slots.push({ selectedId: null });
  }

  return slots;
}

function getFilteredOptions(options: CompareOption[], query: string, selectedIds: string[]) {
  const normalizedQuery = normalize(query);
  const selectedIdSet = new Set(selectedIds);

  return options
    .filter((option) => fuzzyMatch(option.searchLabel, normalizedQuery))
    .sort((left, right) => {
      const leftSelected = selectedIdSet.has(left.id) ? 1 : 0;
      const rightSelected = selectedIdSet.has(right.id) ? 1 : 0;

      if (leftSelected !== rightSelected) {
        return rightSelected - leftSelected;
      }

      return left.searchLabel.localeCompare(right.searchLabel);
    })
    .slice(0, 24);
}

function fuzzyMatch(value: string, query: string) {
  if (!query) {
    return true;
  }

  const haystack = normalize(value);
  const terms = query.split(" ").filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
