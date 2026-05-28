import { useEffect, useRef, useState } from 'react';

interface PlacesAutocompleteProps {
  /** Whether google.maps.places is loaded and ready */
  ready: boolean;
  placeholder?: string;
  /** Called when the user picks a suggestion with a resolved location */
  onPlaceSelect: (lat: number, lon: number) => void;
}

/**
 * Search input with Places Autocomplete suggestions, using the NEW Places
 * API at a lower level than `PlaceAutocompleteElement` so we control:
 *   - the input UI (custom magnifier icon + Tailwind styling)
 *   - debouncing (300 ms — prevents per-keystroke API spam)
 *   - session tokens (billed per-session, not per-request)
 *
 * Flow:
 *   user types  →  debounce 300 ms  →  AutocompleteSuggestion.fetch(...)
 *   click suggestion  →  place.fetchFields({fields:['location']})  →  onPlaceSelect
 *   any selection or session expiry  →  rotate the session token
 */
const DEBOUNCE_MS = 300;

export function PlacesAutocomplete({ ready, placeholder, onPlaceSelect }: PlacesAutocompleteProps) {
  const [query, setQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionTokenRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create / rotate session token whenever ready becomes true (or on rotate).
  const rotateSession = () => {
    if (!ready) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
  };
  useEffect(() => {
    if (ready && !sessionTokenRef.current) rotateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Debounced fetch of suggestions.
  useEffect(() => {
    if (!ready) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // `cancelled` guards against the stale-response race: if the user types
    // again before the previous fetch resolves, the cleanup flips this true
    // and we drop the stale results instead of overwriting newer ones.
    let cancelled = false;

    const handle = window.setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      if (!g?.maps?.places?.AutocompleteSuggestion) return;
      try {
        const { suggestions: results } =
          await g.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            // ISO 3166-1 alpha-2 codes — restricts suggestions to Thailand.
            includedRegionCodes: ['th'],
            sessionToken: sessionTokenRef.current,
          });
        if (cancelled) return;
        setSuggestions(results ?? []);
        setOpen(true);
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[PlacesAutocomplete] fetchAutocompleteSuggestions failed', err);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [ready, query]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Autofocus the input when the component first becomes ready.
  useEffect(() => {
    if (ready) inputRef.current?.focus();
  }, [ready]);

  // Reset highlight when the suggestion list changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  // Keyboard nav: ArrowDown/Up to walk suggestions, Enter to pick, Esc to close.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      // Open the dropdown again if the user hits Down after closing it.
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex]);
        } else if (suggestions.length === 1) {
          // Single match — picking it on Enter is a common UX expectation.
          handleSelect(suggestions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = async (suggestion: any) => {
    const prediction = suggestion?.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['location'],
        sessionToken: sessionTokenRef.current,
      });
      const loc = place.location;
      if (loc) onPlaceSelect(loc.lat(), loc.lng());
      // Reflect the picked place in the input
      setQuery(prediction.text?.toString?.() ?? '');
      setOpen(false);
      // A session ends when a place detail call is made — rotate for next search.
      rotateSession();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[PlacesAutocomplete] place.fetchFields failed', err);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!ready}
          aria-autocomplete="list"
          aria-expanded={open}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg"
        >
          {suggestions.map((suggestion, idx) => {
            const prediction = suggestion?.placePrediction;
            if (!prediction) return null;
            const main = prediction.mainText?.toString?.() ?? prediction.text?.toString?.() ?? '';
            const secondary = prediction.secondaryText?.toString?.() ?? '';
            const isActive = idx === activeIndex;
            return (
              <li key={prediction.placeId ?? idx} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={[
                    'w-full text-left px-3 py-2 text-sm flex flex-col',
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span className="font-medium text-gray-800 truncate">{main}</span>
                  {secondary && <span className="text-xs text-gray-500 truncate">{secondary}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
