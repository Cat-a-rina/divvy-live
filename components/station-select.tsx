"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type StationOption = { id: string; label: string };

// A hand-built listbox instead of a native <select>. Native selects size
// their closed box from our CSS but render the open options popup at a
// width many browsers base on content instead — the two states can't be
// made to match with CSS alone. Building this ourselves means both states
// always share the exact same width, since the open panel is literally
// positioned relative to the closed button.
export function StationSelect({
  options,
  value,
  onChange,
  placeholder = "Select a station",
  ariaLabel,
  disabled,
  className = "",
}: {
  options: StationOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedLabel = options.find((option) => option.id === value)?.label ?? placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded border border-divvy-blue/30 px-3 py-2 text-left text-base font-semibold focus:border-divvy-blue focus:outline-none disabled:opacity-50"
      >
        <span className={`truncate ${value ? "" : "text-[#0a1f3d]/50 font-normal"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={`shrink-0 text-divvy-blue transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-divvy-blue/30 bg-white shadow-lg"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-[#0a1f3d]/50">No stations available</li>
          )}
          {options.map((option) => (
            <li key={option.id} role="option" aria-selected={option.id === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-divvy-blue-light ${
                  option.id === value ? "bg-divvy-blue-light font-semibold" : ""
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
