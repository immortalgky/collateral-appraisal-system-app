import { useState, useRef, useEffect, useId, useMemo } from 'react';
import Icon from '@/shared/components/Icon';

export interface AutocompleteItem {
  value: string;
  label: string;
}

interface AutocompleteProps {
  /**
   * Full item list. For network-backed sources pass only the current search
   * results (already filtered). For client-side sources pass all items and set
   * `filterItems` to enable internal filtering.
   */
  items: AutocompleteItem[];
  /** Currently committed value (code / Guid). Empty string = nothing selected. */
  value: string;
  /** Called with the committed value on selection, or '' on clear/edit. */
  onChange: (value: string) => void;
  /** Display label for the current external value (e.g. resolved from API or store). */
  displayText?: string;
  placeholder?: string;
  /** Show a loading indicator row instead of results. */
  isLoading?: boolean;
  /**
   * Open and show the full list on focus even before typing.
   * Useful for client-side data where the full list is always available.
   */
  showAllOnFocus?: boolean;
  /**
   * If provided, called with (item, inputText) to filter items internally.
   * When omitted, `items` are rendered as-is (caller pre-filters).
   */
  filterItems?: (item: AutocompleteItem, inputText: string) => boolean;
  /** Called whenever the raw input text changes. Use to drive external search queries. */
  onInputChange?: (text: string) => void;
  ariaLabel?: string;
}

function Autocomplete({
  items,
  value,
  onChange,
  displayText,
  placeholder = 'Search...',
  isLoading = false,
  showAllOnFocus = false,
  filterItems,
  onInputChange,
  ariaLabel,
}: AutocompleteProps) {
  const listId = useId();
  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const hydratedForRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(() => {
    if (!filterItems || !inputText.trim()) return items;
    return items.filter(item => filterItems(item, inputText));
  }, [items, inputText, filterItems]);

  // When external value is cleared, reset input
  useEffect(() => {
    if (!value) {
      setInputText('');
      hydratedForRef.current = '';
    }
  }, [value]);

  // When displayText arrives for an external value, populate input once per value
  useEffect(() => {
    if (value && displayText && hydratedForRef.current !== value) {
      setInputText(displayText);
      hydratedForRef.current = value;
    }
  }, [value, displayText]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: AutocompleteItem) => {
    setInputText(item.label);
    hydratedForRef.current = item.value;
    setOpen(false);
    setHighlightIndex(-1);
    onChange(item.value);
  };

  const handleClear = () => {
    setInputText('');
    onInputChange?.('');
    hydratedForRef.current = '';
    setOpen(false);
    setHighlightIndex(-1);
    onChange('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInputText(next);
    onInputChange?.(next);
    setHighlightIndex(-1);

    if (!next) {
      onChange('');
      setOpen(false);
      return;
    }

    // If the user edits away from the selected item's label, clear the committed value
    if (value && displayText && next !== displayText) {
      onChange('');
    }

    setOpen(true);
  };

  const handleFocus = () => {
    if (showAllOnFocus || inputText) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown') {
        setOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, visibleItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && visibleItems[highlightIndex]) {
          handleSelect(visibleItems[highlightIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  const showDropdown = open && (visibleItems.length > 0 || isLoading);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          role="combobox"
          aria-label={ariaLabel ?? placeholder}
          aria-expanded={open}
          aria-controls={listId}
          aria-busy={isLoading}
          aria-autocomplete="list"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white max-w-[200px] pr-7"
        />
        {inputText && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear"
          >
            <Icon style="solid" name="xmark" className="size-3" />
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-56 max-h-52 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm"
        >
          {isLoading && visibleItems.length === 0 ? (
            <li role="option" aria-selected={false} className="px-3 py-2 text-gray-400 italic">
              Searching…
            </li>
          ) : (
            visibleItems.map((item, i) => (
              <li key={item.value} role="option" aria-selected={i === highlightIndex}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2 truncate ${
                    i === highlightIndex
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default Autocomplete;
