import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';

// Canonical banking segments. NULL/blank segments are treated as IBG server-side.
const SEGMENTS = ['Retail', 'IBG'] as const;

type SegmentSelectProps = {
  value?: string; // undefined = all segments
  onChange: (segment?: string) => void;
};

function SegmentSelect({ value, onChange }: SegmentSelectProps) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const select = (segment?: string) => {
    onChange(segment);
    setOpen(false);
  };

  // Resolve case-insensitively to a known segment (handles stale/lowercase persisted
  // values); fall back to the raw value rather than leaking a missing i18n key.
  const known = SEGMENTS.find(s => s.toLowerCase() === value?.toLowerCase());
  const label = !value ? t('segment.all') : known ? t(`segment.${known}`) : value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>{label}</span>
        <Icon name="chevron-down" style="solid" className="size-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg p-2">
          <ul className="text-sm">
            <li>
              <button
                type="button"
                onClick={() => select(undefined)}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 ${
                  !value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                {t('segment.all')}
              </button>
            </li>
            {SEGMENTS.map(seg => (
              <li key={seg}>
                <button
                  type="button"
                  onClick={() => select(seg)}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 ${
                    value === seg ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {t(`segment.${seg}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SegmentSelect;
