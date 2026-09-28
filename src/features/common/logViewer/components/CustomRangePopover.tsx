import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import DateTimePickerInput from '@shared/components/inputs/DateTimePickerInput';
import { AROUND_MINUTES, resolveAroundRange, validateRange } from '../utils/range';

type Mode = 'range' | 'around';

interface CustomRangePopoverProps {
  active: boolean;
  from: Date;
  to: Date;
  onApply: (from: Date, to: Date) => void;
}

const CustomRangePopover = ({ active, from, to, onApply }: CustomRangePopoverProps) => {
  const { t } = useTranslation('logAdmin');
  const [mode, setMode] = useState<Mode>('range');
  const [rangeFrom, setRangeFrom] = useState(from);
  const [rangeTo, setRangeTo] = useState(to);
  const [at, setAt] = useState(new Date(from.getTime() + (to.getTime() - from.getTime()) / 2));
  const [plusMinus, setPlusMinus] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the pickers with the search's current window every time the popover reopens, rather
  // than keeping whatever was last typed in a previous session.
  const resetDrafts = () => {
    setRangeFrom(from);
    setRangeTo(to);
    setAt(new Date(from.getTime() + (to.getTime() - from.getTime()) / 2));
    setError(null);
  };
  useEffect(() => {
    if (active) resetDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const apply = (close: () => void) => {
    const around = resolveAroundRange(at, plusMinus);
    const nextFrom = mode === 'range' ? rangeFrom : around.from;
    const nextTo = mode === 'range' ? rangeTo : around.to;
    const errorKey = validateRange(nextFrom, nextTo);
    if (errorKey) {
      setError(t(errorKey));
      return;
    }
    onApply(nextFrom, nextTo);
    close();
  };

  return (
    <Popover className="relative">
      <PopoverButton
        onClick={resetDrafts}
        aria-haspopup="dialog"
        className={clsx(
          'inline-flex items-center gap-1.5 h-7 rounded-lg border px-3 text-sm outline-none transition-colors',
          active
            ? 'border-primary/30 bg-primary/5 text-primary font-medium'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
        )}
      >
        <Icon name="sliders" style="regular" className="size-3.5" />
        {t('range.custom')}
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-50 mt-1.5 w-[min(560px,90vw)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg flex flex-col gap-3"
      >
        {({ close }) => (
          <>
            <div className="flex gap-4 border-b border-gray-100">
              {(['range', 'around'] as Mode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={clsx(
                    'pb-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                    mode === m
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  {t(m === 'range' ? 'range.customModeRange' : 'range.customModeAround')}
                </button>
              ))}
            </div>

            {mode === 'range' ? (
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-48">
                  <DateTimePickerInput
                    label={t('range.from')}
                    value={rangeFrom}
                    onChange={v => v && setRangeFrom(new Date(v))}
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <DateTimePickerInput
                    label={t('range.to')}
                    value={rangeTo}
                    onChange={v => v && setRangeTo(new Date(v))}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-48">
                  <DateTimePickerInput
                    label={t('range.incidentTime')}
                    value={at}
                    onChange={v => v && setAt(new Date(v))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('range.plusMinus')}
                  </label>
                  <select
                    value={plusMinus}
                    onChange={e => setPlusMinus(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {AROUND_MINUTES.map(m => (
                      <option key={m} value={m}>
                        {t('range.plusMinusOption', { minutes: m })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-danger bg-danger/5 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => close()}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300"
              >
                {t('range.cancel')}
              </button>
              <button
                type="button"
                onClick={() => apply(close)}
                className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-content hover:bg-primary/90"
              >
                {t('range.apply')}
              </button>
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
};

export default CustomRangePopover;
