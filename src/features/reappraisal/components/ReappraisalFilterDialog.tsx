import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { TextInput, DateInput, Dropdown } from '@/shared/components/inputs';
import { DUE_SOON_DAYS } from '../utils/due';
import type { PriorSourceFilter, ReappraisalFilterValues, ReviewTypeCode } from '../types';

// Due-date presets map onto the remaining-day range the API already filters on.
type DuePreset = 'overdue' | 'dueSoon' | 'halfYear' | 'year' | 'custom';

const DUE_PRESETS: Record<Exclude<DuePreset, 'custom'>, { from?: number; to: number }> = {
  overdue: { to: -1 },
  dueSoon: { from: 0, to: DUE_SOON_DAYS },
  halfYear: { from: 0, to: 182 },
  year: { from: 0, to: 365 },
};

function presetOf(v: ReappraisalFilterValues): DuePreset | undefined {
  if (v.remainingDayFrom == null && v.remainingDayTo == null) return undefined;
  const hit = (Object.keys(DUE_PRESETS) as (keyof typeof DUE_PRESETS)[]).find(
    k => DUE_PRESETS[k].from === v.remainingDayFrom && DUE_PRESETS[k].to === v.remainingDayTo,
  );
  return hit ?? 'custom';
}

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
  const { t } = useTranslation('reappraisal');
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-gray-600">{label}</h3>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {t('filter.clear')}
        </button>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReappraisalFilterDialogProps {
  open: boolean;
  initialValues: ReappraisalFilterValues;
  /** The due-date section; off on the processed tab, which has no due date. */
  showDue?: boolean;
  onApply: (values: ReappraisalFilterValues) => void;
  onClose: () => void;
}

export function ReappraisalFilterDialog({
  open,
  initialValues,
  showDue = true,
  onApply,
  onClose,
}: ReappraisalFilterDialogProps) {
  const { t } = useTranslation(['reappraisal', 'common']);
  const [values, setValues] = useState<ReappraisalFilterValues>(initialValues);
  const [customDue, setCustomDue] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setCustomDue(presetOf(initialValues) === 'custom');
    }
  }, [open, initialValues]);

  const set = (patch: Partial<ReappraisalFilterValues>) => setValues(v => ({ ...v, ...patch }));
  const preset = customDue ? 'custom' : presetOf(values);

  const pickPreset = (p: DuePreset) => {
    if (p === 'custom') {
      setCustomDue(true);
      return;
    }
    setCustomDue(false);
    if (preset === p) {
      set({ remainingDayFrom: undefined, remainingDayTo: undefined });
    } else {
      set({ remainingDayFrom: DUE_PRESETS[p].from, remainingDayTo: DUE_PRESETS[p].to });
    }
  };

  const handleApply = () => {
    onApply(values);
    onClose();
  };

  const numberInput = (key: 'remainingDayFrom' | 'remainingDayTo', placeholder: string) => (
    <input
      id={`reappraisal-filter-${key}`}
      type="number"
      placeholder={placeholder}
      value={values[key] ?? ''}
      onChange={e => set({ [key]: e.target.value !== '' ? Number(e.target.value) : undefined })}
      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
    />
  );

  return (
    <Modal isOpen={open} onClose={onClose} title={t('filter.title')} size="lg">
      <div className="space-y-5">
        {/* ── Review type ── */}
        <section className="space-y-2">
          <SectionLabel label={t('filter.fields.reviewType')} />
          <div className="flex flex-wrap gap-1.5">
            <Chip on={!values.reviewType} onClick={() => set({ reviewType: undefined })}>
              {t('filter.all')}
            </Chip>
            {(['3', '2', '1'] as ReviewTypeCode[]).map(code => (
              <Chip
                key={code}
                on={values.reviewType === code}
                onClick={() => set({ reviewType: values.reviewType === code ? undefined : code })}
              >
                {t(`reviewType.${code}`)}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Review due ── */}
        <section className={clsx('space-y-2', !showDue && 'hidden')}>
          <SectionLabel
            label={t('filter.reviewDue')}
            onClear={
              preset
                ? () => {
                    setCustomDue(false);
                    set({ remainingDayFrom: undefined, remainingDayTo: undefined });
                  }
                : undefined
            }
          />
          <div className="flex flex-wrap gap-1.5">
            {(['overdue', 'dueSoon', 'halfYear', 'year', 'custom'] as const).map(p => (
              <Chip key={p} on={preset === p} onClick={() => pickPreset(p)}>
                {t(`filter.duePreset.${p}`)}
              </Chip>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-x-4">
              <div>
                <label
                  htmlFor="reappraisal-filter-remainingDayFrom"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  {t('filter.daysLeftFrom')}
                </label>
                {numberInput('remainingDayFrom', t('filter.placeholders.remainingDayFrom'))}
              </div>
              <div>
                <label
                  htmlFor="reappraisal-filter-remainingDayTo"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  {t('filter.daysLeftTo')}
                </label>
                {numberInput('remainingDayTo', t('filter.placeholders.remainingDayTo'))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-400">{t('filter.reviewDueHint')}</p>
        </section>

        {/* ── Review date range ── */}
        <section className="space-y-2">
          <SectionLabel
            label={t('filter.reviewDateRange')}
            onClear={
              values.reviewDateFrom || values.reviewDateTo
                ? () => set({ reviewDateFrom: undefined, reviewDateTo: undefined })
                : undefined
            }
          />
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.from')}
              </label>
              <DateInput
                value={values.reviewDateFrom ?? null}
                onChange={val => set({ reviewDateFrom: val ?? undefined })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('common:range.to')}
              </label>
              <DateInput
                value={values.reviewDateTo ?? null}
                onChange={val => set({ reviewDateTo: val ?? undefined })}
              />
            </div>
          </div>
        </section>

        {/* ── Specific ── */}
        <section className="space-y-2">
          <SectionLabel label={t('filter.specific')} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <TextInput
              label={t('filter.fields.collateralId')}
              placeholder={t('filter.placeholders.collateralId')}
              value={values.collateralId ?? ''}
              onChange={e => set({ collateralId: e.target.value || undefined })}
            />
            <Dropdown
              label={t('filter.fields.priorSource')}
              aria-label={t('filter.fields.priorSource')}
              showValuePrefix={false}
              value={values.priorSource ?? ''}
              onChange={(val: string) =>
                set({ priorSource: (val || undefined) as PriorSourceFilter | undefined })
              }
              placeholder={t('filter.all')}
              options={(['CAS', 'AS400Legacy', 'Unknown', 'NonCAS'] as const).map(s => ({
                value: s,
                label: t(`filter.priorSource.${s}`),
              }))}
            />
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
