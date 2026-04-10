import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@shared/components/Icon';
import type { IconStyle } from '../types';

const ICON_STYLES: IconStyle[] = ['solid', 'regular', 'light', 'duotone', 'thin', 'brands'];

// Module-level cache — parsed once per style, shared across all instances
const iconCache = new Map<IconStyle, string[]>();

async function loadIconsForStyle(style: IconStyle): Promise<string[]> {
  if (iconCache.has(style)) return iconCache.get(style)!;
  try {
    const res = await fetch(`/icons/${style}.svg`);
    if (!res.ok) return [];
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const ids = Array.from(doc.querySelectorAll('symbol[id]')).map(el => el.getAttribute('id')!);
    iconCache.set(style, ids);
    return ids;
  } catch {
    iconCache.set(style, []);
    return [];
  }
}

interface IconPickerProps {
  value: string;
  styleValue: IconStyle;
  onChangeIcon: (name: string) => void;
  onChangeStyle: (style: IconStyle) => void;
  disabled?: boolean;
}

/**
 * Icon picker that parses FontAwesome Pro sprite SVGs at runtime.
 * Caches parsed icon lists in a module-level Map so subsequent opens are free.
 */
export function IconPicker({
  value,
  styleValue,
  onChangeIcon,
  onChangeStyle,
  disabled = false,
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus the search input on open (only after user explicitly toggles; avoids
  // jsx-a11y/no-autofocus lint warning by making focus a side-effect of the
  // click handler rather than a render-time auto-focus).
  const focusSearchOnMount = useCallback((el: HTMLInputElement | null) => {
    searchInputRef.current = el;
    if (el) el.focus();
  }, []);

  // Load icons whenever style changes
  useEffect(() => {
    setLoading(true);
    loadIconsForStyle(styleValue).then(ids => {
      setIcons(ids);
      setLoading(false);
    });
  }, [styleValue]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const filtered = search
    ? icons.filter(id => id.toLowerCase().includes(search.toLowerCase()))
    : icons;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {value ? (
          <>
            <Icon name={value} style={styleValue} className="size-4 text-gray-600" />
            <span className="text-gray-700">{value}</span>
          </>
        ) : (
          <span className="text-gray-400">Pick icon...</span>
        )}
        <Icon name="chevron-down" style="solid" className="size-3 text-gray-400 ml-auto" />
      </button>

      {/* Picker dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg">
          {/* Style selector */}
          <div className="p-2 border-b border-gray-100 flex flex-wrap gap-1">
            {ICON_STYLES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeStyle(s)}
                className={`px-2 py-0.5 rounded text-xs font-medium capitalize transition-colors ${
                  styleValue === s
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={focusSearchOnMount}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search icons..."
              aria-label="Search icons"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Icon grid */}
          <div className="p-2 max-h-56 overflow-y-auto">
            {loading ? (
              <p className="text-center text-sm text-gray-400 py-4">Loading icons...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No icons found</p>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {filtered.slice(0, 200).map(id => (
                  <button
                    key={id}
                    type="button"
                    title={id}
                    onClick={() => {
                      onChangeIcon(id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-center p-1.5 rounded hover:bg-gray-100 transition-colors ${
                      value === id ? 'bg-primary/10 ring-1 ring-primary' : ''
                    }`}
                  >
                    <Icon name={id} style={styleValue} className="size-4 text-gray-600" />
                  </button>
                ))}
              </div>
            )}
            {!loading && filtered.length > 200 && (
              <p className="text-center text-xs text-gray-400 mt-2">
                {filtered.length - 200} more — refine your search
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
