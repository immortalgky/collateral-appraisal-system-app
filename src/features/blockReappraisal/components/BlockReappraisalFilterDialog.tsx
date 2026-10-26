import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { DateInput } from '@/shared/components/inputs';
import { DUE_SOON_DAYS } from '@/features/reappraisal/utils/due';
import type { BlockReappraisalFilterValues } from '../types';

// Remaining-day presets map onto the min/max range the API already filters on.
type DuePreset = 'overdue' | 'dueSoon' | 'halfYear' | 'custom';

const DUE_PRESETS: Record<Exclude<DuePreset, 'custom'>, { min?: number; max: number }> = {
  overdue: { max: -1 },
  dueSoon: { min: 0, max: DUE_SOON_DAYS },
  halfYear: { min: 0, max: 182 },
};

function presetOf(v: BlockReappraisalFilterValues): DuePreset | undefined {
  if (v.remainingDayMin == null && v.remainingDayMax == null) return undefined;
  const hit = (Object.keys(DUE_PRESETS) as (keyof typeof DUE_PRESETS)[]).find(
    k => DUE_PRESETS[k].min === v.remainingDayMin && DUE_PRESETS[k].max === v.remainingDayMax,
  );
  return hit ?? 'custom';
}

const toDateOnly = (v: string | null): string | undefined => (v ? v.slice(0, 10) : undefined);

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        'px-3 py-1 text-xs rounded-full border transition-colors',
        on
          ? 'border-primary bg-primary/5 text-primary font-medium'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
      )}
    >
      {children}
    </button>
  );
}

function SectionLabel({ label, onClear }: { label: string; onClear?: () => void }) {
  const { t } = useTranslation('blockReappraisal');
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-gray-600">{label}</h3>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {t('filter.clearSection')}
        </button>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BlockReappraisalFilterDialogProps {
  open: boolean;
  initialValues: BlockReappraisalFilterValues;
  onApply: (values: BlockReappraisalFilterValues) => void;
  onClose: () => void;
}

export function BlockReappraisalFilterDialog({
  open,
  initialValues,
  onApply,
  onClose,
}: BlockReappraisalFilterDialogProps) {
  const { t } = useTranslation(['blockReappraisal', 'common']);
  const [values, setValues] = useState<BlockReappraisalFilterValues>(initialValues);
  const [customDue, setCustomDue] = useState(false);

  // The draft starts from the applied filters each time the dialog opens — not on every new
  // initialValues object while it is open, which would wipe the user's edits.
  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setCustomDue(presetOf(initialValues) === 'custom');
    }
  }, [open]);

  const set = (patch: Partial<BlockReappraisalFilterValues>) =>
    setValues(v => ({ ...v, ...patch }));
  const preset = customDue ? 'custom' : presetOf(values);

  const pickPreset = (p: DuePreset) => {
    if (p === 'custom') {
      setCustomDue(true);
      return;
    }
    setCustomDue(false);
    if (preset === p) {
      set({ remainingDayMin: undefined, remainingDayMax: undefined });
    } else {
      set({ remainingDayMin: DUE_PRESETS[p].min, remainingDayMax: DUE_PRESETS[p].max });
    }
  };

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  const numberInput = (key: 'remainingDayMin' | 'remainingDayMax', placeholder: string) => (
    <input
      id={`block-reappraisal-filter-${key}`}
      type="number"
      step={1}
      placeholder={placeholder}
      value={values[key] ?? ''}
      onChange={e =>
        set({ [key]: e.target.value !== '' ? Math.trunc(Number(e.target.value)) : undefined })
      }
      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
    />
  );

  return (
    <Modal isOpen={open} onClose={onClose} title={t('filter.title')} size="lg">
      <div className="space-y-5">
        {/* ── Remaining day ── */}
        <section className="space-y-2">
          <SectionLabel
            label={t('filter.fields.remainingDay')}
            onClear={
              preset
                ? () => {
                    setCustomDue(false);
                    set({ remainingDayMin: undefined, remainingDayMax: undefined });
                  }
                : undefined
            }
          />
          <div className="flex flex-wrap gap-1.5">
            {(['overdue', 'dueSoon', 'halfYear', 'custom'] as const).map(p => (
              <Chip key={p} on={preset === p} onClick={() => pickPreset(p)}>
                {t(`filter.duePreset.${p}`)}
              </Chip>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-x-4">
              <div>
                <label
                  htmlFor="block-reappraisal-filter-remainingDayMin"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  {t('filter.daysLeftFrom')}
                </label>
                {numberInput('remainingDayMin', t('filter.placeholders.min'))}
              </div>
              <div>
                <label
                  htmlFor="block-reappraisal-filter-remainingDayMax"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  {t('filter.daysLeftTo')}
                </label>
                {numberInput('remainingDayMax', t('filter.placeholders.max'))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">{t('filter.remainingDayHint')}</p>
        </section>

        {/* ── Last appraisal date range ── */}
        <section className="space-y-2">
          <SectionLabel
            label={t('filter.fields.lastAppraisedDate')}
            onClear={
              values.lastAppraisedDateFrom || values.lastAppraisedDateTo
                ? () => set({ lastAppraisedDateFrom: undefined, lastAppraisedDateTo: undefined })
                : undefined
            }
          />
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.from')}
              </label>
              <DateInput
                value={values.lastAppraisedDateFrom ?? null}
                onChange={v => set({ lastAppraisedDateFrom: toDateOnly(v) })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.to')}
              </label>
              <DateInput
                value={values.lastAppraisedDateTo ?? null}
                onChange={v => set({ lastAppraisedDateTo: toDateOnly(v) })}
              />
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="mr-auto"
            onClick={() => {
              setCustomDue(false);
              setValues({});
            }}
          >
            {t('common:actions.clearAll')}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            {t('common:actions.apply')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
