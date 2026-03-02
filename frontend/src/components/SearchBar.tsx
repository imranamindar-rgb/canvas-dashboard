import React from "react";

interface Props {
  query: string;
  onChange: (query: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar({ query, onChange, inputRef }: Props) {
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-3 sm:px-6">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search assignments..."
          aria-label="Search assignments"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-9 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        {/* Clear button */}
        {query && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
