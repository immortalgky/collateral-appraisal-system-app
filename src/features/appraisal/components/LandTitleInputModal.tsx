import Button from '@/shared/components/Button';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { buildFormSchema, type FormField, FormFields } from '@/shared/components/form';
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';

import { landtitlesFields } from '@features/appraisal/configs/fields.ts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { DEED_SHEET_FIELDS, TitleDeedSheet } from './TitleDeedSheet';
import { TitleFormView, toRaiNganWa, useTitleFieldLabels } from './TitleFormView';

type TitleView = 'deed' | 'form';

/** A new title starts as a โฉนด, by far the most common; editing keeps whatever was saved. */
const NEW_TITLE_DEFAULTS = { titleType: 'DEED' };
const VIEW_KEY = 'cas.titleEntryView';
/** Title types with a paper to draw; ตราจอง and others are keyed in the form view only. */
const DOCUMENT_TITLE_TYPES = new Set(['DEED', 'NS3K', 'NS3', 'NS3KO']);

/** The view the user picked last time, per browser. Storage can be unavailable; fall back quietly. */
const readView = (): TitleView => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'form' ? 'form' : 'deed';
  } catch {
    return 'deed';
  }
};

interface LandTitleModalProps {
  fields: FormField[];
  defaultValues?: Record<string, any>;
  onCancel: () => void;
  onSave: (data: Record<string, any>) => void;
  readOnly?: boolean;
}

const createLandTitleForm = buildFormSchema(landtitlesFields);

const LandTitleModal = ({
  fields,
  defaultValues,
  onCancel,
  onSave,
  readOnly = false,
}: LandTitleModalProps) => {
  // Escape closes, the way every other dialog in the app does. Bound on the document rather
  // than the panel so it works before anything inside has been focused.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  // Clicking the backdrop closes, but only when the press started there too. Without the
  // mousedown check, selecting text inside a field and releasing outside the panel would count
  // as an outside click and throw the edit away.
  const pressedBackdrop = useRef(false);
  const onBackdropMouseDown = useCallback((event: React.MouseEvent) => {
    pressedBackdrop.current = event.target === event.currentTarget;
  }, []);
  const onBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (pressedBackdrop.current && event.target === event.currentTarget) onCancel();
      pressedBackdrop.current = false;
    },
    [onCancel],
  );

  const { t } = useTranslation('appraisal');
  const translate = useTitleFieldLabels();
  // The page's own form (this dialog renders inside it, and only portals its markup out): its title
  // address — from the land detail — goes on the paper for orientation. Read-only here.
  const pageForm = useFormContext();
  const [subDistrictName, districtName, provinceName] = useWatch({
    control: pageForm?.control,
    name: ['subDistrictName', 'districtName', 'provinceName'],
  }) as (string | null | undefined)[];
  const [view, setView] = useState<TitleView>(readView);
  const chooseView = (next: TitleView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just won't be remembered.
    }
  };
  // Both views share the side panel — what the appraiser checks on site, not printed on the title —
  // and differ only on the left: the paper, or the form cards. The title type sits in the header in
  // both (label drawn beside it, not above).
  const titleTypeField = fields
    .filter(field => field.name === 'titleType')
    .map(field => ({ ...field, label: '' }));
  const pick = (names: string[]) =>
    fields.filter(field => names.includes(field.name)).map(translate);
  // Boundary marker as one-click pills, the way Document Validate already reads.
  const checkFields = pick([
    'boundaryMarkerType',
    'boundaryMarkerRemark',
    'documentValidationResultType',
  ]).map(field =>
    field.name === 'boundaryMarkerType'
      ? ({
          ...field,
          type: 'radio-group',
          orientation: 'horizontal',
          variant: 'button',
        } as FormField)
      : field,
  );
  const priceFields = pick(['isMissingFromSurvey', 'governmentPricePerSqWa']);
  const shownElsewhere = new Set([
    ...DEED_SHEET_FIELDS,
    'boundaryMarkerType',
    'boundaryMarkerRemark',
    'documentValidationResultType',
    'isMissingFromSurvey',
    'governmentPricePerSqWa',
    'governmentPrice',
  ]);
  // Anything a future config adds still gets a place.
  const otherFields = fields.filter(field => !shownElsewhere.has(field.name));

  const form = useForm({
    resolver: zodResolver(createLandTitleForm),
    defaultValues: defaultValues ?? NEW_TITLE_DEFAULTS,
  });

  useEffect(() => {
    form.reset(defaultValues ?? NEW_TITLE_DEFAULTS);
  }, [defaultValues, form]);

  const { watch, setValue } = form;
  const pricePerSqWa = watch('governmentPricePerSqWa');
  const rai = watch('rai');
  const ngan = watch('ngan');
  const squareWa = watch('squareWa');

  useEffect(() => {
    const price = Number(pricePerSqWa) || 0;
    const totalWa = (Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(squareWa) || 0);
    setValue('totalSquareWa', totalWa);
    setValue('governmentPrice', Math.round(price * totalWa * 100) / 100);
  }, [pricePerSqWa, rai, ngan, squareWa, setValue]);

  // Area fields default to 0 when left blank, so they persist as 0 rather than null
  // (keeps Total Sq.Wa / government price math and the summary totals clean).
  const titleNumber = watch('titleNumber');
  // The saved preference stays as it was, so switching back to a โฉนด brings the paper back.
  const hasDocument = DOCUMENT_TITLE_TYPES.has(watch('titleType'));
  const shownView: TitleView = hasDocument ? view : 'form';
  const totalWa = Number(watch('totalSquareWa')) || 0;
  const governmentPrice = Number(watch('governmentPrice')) || 0;
  const isMissingFromSurvey = watch('isMissingFromSurvey');
  const money = (n: number, digits = 2) =>
    n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const handleSave = form.handleSubmit(data =>
    onSave({
      ...data,
      rai: data.rai ?? 0,
      ngan: data.ngan ?? 0,
      squareWa: data.squareWa ?? 0,
    }),
  );

  // Rendered into <body>. `position: fixed` is only viewport-relative while no ancestor
  // establishes a containing block, and this dialog sits deep inside the form — under an
  // `overflow-hidden` wrapper and a scroll container. A portal makes that irrelevant instead
  // of leaving the dialog's position at the mercy of its ancestors, and it also lifts the
  // dialog out of `.cas-form-grid` so the grid layout's field rules never reach inside it.
  return createPortal(
    <FormProvider {...form}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8"
        role="presentation"
        onMouseDown={onBackdropMouseDown}
        onClick={onBackdropClick}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Title Detail"
          className={clsx(
            'flex max-h-full flex-col rounded-2xl bg-white shadow-2xl',
            'w-full max-w-[1180px]',
          )}
        >
          <div className="shrink-0 border-b border-gray-200 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* The title number can run to 200 characters: the summary truncates, full text on hover. */}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">Title Detail</h2>
                <p className="truncate text-xs text-gray-500" title={titleNumber || undefined}>
                  {t('titleEntry.summary', { no: titleNumber || '—', area: toRaiNganWa(totalWa) })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {t('titleEntry.typeLabel')}
                  </span>
                  <div className="w-60">
                    <FormFields fields={titleTypeField} />
                  </div>
                </div>
                <SegmentedControl
                  label={t('titleEntry.viewLabel')}
                  value={shownView}
                  onChange={chooseView}
                  options={[
                    {
                      value: 'deed',
                      label: t('titleEntry.viewDocument'),
                      icon: 'file-lines',
                      disabled: !hasDocument,
                    },
                    { value: 'form', label: t('titleEntry.viewForm'), icon: 'list-check' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* The side panel keeps the classic stacked labels: a label column does not fit in it. */}
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto overflow-x-hidden bg-gray-50 lg:grid-cols-[minmax(0,1fr)_340px]">
            {shownView === 'deed' ? (
              <div className="grid min-w-0 content-start justify-items-center p-6">
                <TitleDeedSheet
                  fields={fields}
                  address={{
                    subDistrict: subDistrictName,
                    district: districtName,
                    province: provinceName,
                  }}
                />
              </div>
            ) : (
              <div className="min-w-0 bg-white">
                <TitleFormView fields={fields} />
              </div>
            )}
            <aside className="grid content-start gap-6 border-t border-gray-200 bg-white p-5 lg:border-l lg:border-t-0">
              <section className="grid gap-3">
                <h3 className="flex items-baseline gap-2 text-sm font-semibold text-gray-800">
                  {t('titleEntry.checks.title')}
                  <span className="text-xs font-normal text-gray-400">
                    {t('titleEntry.checks.hint')}
                  </span>
                </h3>
                <div className="grid grid-cols-12 gap-3">
                  <FormFields fields={checkFields} />
                </div>
              </section>
              <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  {t('titleEntry.price.title')}
                </h3>
                <div className="grid grid-cols-12 gap-3">
                  <FormFields fields={priceFields} />
                </div>
                <div className="flex items-baseline justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                  <span className="text-xs text-gray-500">{t('titleEntry.price.label')}</span>
                  <div className="text-right tabular-nums">
                    <div className="text-lg font-semibold text-gray-900">
                      {money(governmentPrice)}
                    </div>
                    <div className="text-[11.5px] text-gray-400">
                      {t('titleEntry.price.formula', {
                        wa: money(totalWa),
                        rate: money(
                          isMissingFromSurvey ? 0 : Number(watch('governmentPricePerSqWa')) || 0,
                        ),
                      })}
                    </div>
                  </div>
                </div>
              </section>
              {otherFields.length > 0 && (
                <div className="grid grid-cols-12 gap-3">
                  <FormFields fields={otherFields} />
                </div>
              )}
            </aside>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-3">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancel
            </Button>
            {!readOnly && (
              <Button variant="primary" type="button" onClick={handleSave}>
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>,
    document.body,
  );
};

export default LandTitleModal;
