import { useEffect, useRef, useState } from 'react';
import Icon from '@shared/components/Icon';
import {
  PERIOD_LABELS,
  type PeriodPresetKey,
  type CustomRange,
  toIsoDate,
  fromIsoDate,
} from '../utils/periodPresets';

type PeriodSelectProps = {
  value: PeriodPresetKey;
  custom?: CustomRange;
  onChange: (key: PeriodPresetKey, custom?: CustomRange) => void;
};

const PRESETS: PeriodPresetKey[] = ['MTD', 'QTD', 'YTD', 'LAST_12M', 'CUSTOM'];

function PeriodSelect({ value, custom, onChange }: PeriodSelectProps) {
  const [open, setOpen] = useState(false);
  const [fromStr, setFromStr] = useState(custom ? toIsoDate(custom.from) : '');
  const [toStr, setToStr] = useState(custom ? toIsoDate(custom.to) : '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handlePreset = (key: PeriodPresetKey) => {
    if (key !== 'CUSTOM') {
      onChange(key);
      setOpen(false);
    } else {
      // When switching to custom without dates yet, default to this year.
      if (!fromStr || !toStr) {
        const y = new Date().getFullYear();
        const f = `${y}-01-01`;
        const t = toIsoDate(new Date());
        setFromStr(f);
        setToStr(t);
        onChange('CUSTOM', { from: fromIsoDate(f), to: fromIsoDate(t) });
      } else {
        onChange('CUSTOM', { from: fromIsoDate(fromStr), to: fromIsoDate(toStr) });
      }
    }
  };

  const applyCustom = () => {
    if (!fromStr || !toStr) return;
    const from = fromIsoDate(fromStr);
    const to = fromIsoDate(toStr);
    if (from > to) return;
    onChange('CUSTOM', { from, to });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>{PERIOD_LABELS[value]}</span>
        <Icon name="chevron-down" style="solid" className="size-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-2">
          <ul className="text-sm">
            {PRESETS.map(p => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 ${
                    value === p ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              </li>
            ))}
          </ul>

          {value === 'CUSTOM' && (
            <div className="mt-2 border-t border-gray-100 pt-2 flex flex-col gap-2">
              <label className="text-xs text-gray-500">
                From
                <input
                  type="date"
                  value={fromStr}
                  onChange={e => setFromStr(e.target.value)}
                  className="mt-0.5 w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="text-xs text-gray-500">
                To
                <input
                  type="date"
                  value={toStr}
                  onChange={e => setToStr(e.target.value)}
                  className="mt-0.5 w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <button
                type="button"
                onClick={applyCustom}
                disabled={!fromStr || !toStr || fromIsoDate(fromStr) > fromIsoDate(toStr)}
                className="mt-1 text-sm font-medium rounded bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PeriodSelect;
