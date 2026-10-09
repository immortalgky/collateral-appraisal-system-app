import type { ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormFields, type FormField } from '@/shared/components/form';
import { evaluateConditions } from '@/shared/components/form/conditions';

/**
 * The title entry laid out as a form: a flat section each for the document numbers, the land's
 * position and the area (the title type is picked in the dialog header, as in the document view). It edits the same fields as the document
 * view, through the same configs, so showWhen / requiredWhen and the dialog's schema apply alike.
 */

const FIELD_LABEL_KEYS = {
  titleNumber: 'titleEntry.fields.titleNumber',
  bookNumber: 'titleEntry.fields.bookNumber',
  pageNumber: 'titleEntry.fields.pageNumber',
  rawang: 'titleEntry.fields.rawang',
  landParcelNumber: 'titleEntry.fields.landParcelNumber',
  surveyNumber: 'titleEntry.fields.surveyNumber',
  mapSheetNumber: 'titleEntry.fields.mapSheetNumber',
  aerialMapName: 'titleEntry.fields.aerialMapName',
  aerialMapNumber: 'titleEntry.fields.aerialMapNumber',
  boundaryMarkerType: 'titleEntry.fields.boundaryMarkerType',
  boundaryMarkerRemark: 'titleEntry.fields.boundaryMarkerRemark',
  documentValidationResultType: 'titleEntry.fields.documentValidationResultType',
  isMissingFromSurvey: 'titleEntry.fields.isMissingFromSurvey',
  governmentPricePerSqWa: 'titleEntry.fields.governmentPricePerSqWa',
  rai: 'titleEntry.area.rai',
  ngan: 'titleEntry.area.ngan',
  squareWa: 'titleEntry.area.wa',
} as const;

/** A field config with its label translated, where the dialog has a translation for it. */
export function useTitleFieldLabels() {
  const { t } = useTranslation('appraisal');
  return (field: FormField): FormField => {
    const key = FIELD_LABEL_KEYS[field.name as keyof typeof FIELD_LABEL_KEYS];
    return key ? ({ ...field, label: t(key) } as FormField) : field;
  };
}

const money = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 0-1-50 style: rai-ngan-wa from a square-wa total. */
export const toRaiNganWa = (totalWa: number) =>
  `${Math.floor(totalWa / 400)}-${Math.floor((totalWa % 400) / 100)}-${money(totalWa % 100, totalWa % 1 ? 2 : 0)}`;

/** A section: its title above the fields. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Rai, ngan and wa through the shared number inputs, so the config's digit, decimal and max limits
 * apply as they always have, with the total read out at the end of the row.
 */
function AreaInput({ fields }: { fields: FormField[] }) {
  const { t } = useTranslation('appraisal');
  const { control } = useFormContext();
  const totalWa = Number(useWatch({ control, name: 'totalSquareWa' })) || 0;

  return (
    <div className="grid grid-cols-12 items-end gap-3.5">
      <FormFields fields={fields} />
      <div className="col-span-12 text-right leading-tight tabular-nums sm:col-span-6">
        <div className="text-[17px] font-semibold text-gray-900">
          {t('titleEntry.area.total', { wa: money(totalWa) })}
        </div>
        <div className="text-xs text-gray-500">
          {t('titleEntry.area.asRai', { rnw: toRaiNganWa(totalWa) })}
        </div>
      </div>
    </div>
  );
}

export function TitleFormView({ fields }: { fields: FormField[] }) {
  const { t } = useTranslation('appraisal');
  const translate = useTitleFieldLabels();
  const values = useWatch() as Record<string, unknown>;
  const byName = new Map(fields.map(field => [field.name, field]));

  // A span given here replaces the config's own col-span for this view.
  const pick = (...entries: [name: string, span: string][]) =>
    entries.flatMap(([name, span]) => {
      const field = byName.get(name);
      if (!field) return [];
      const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
      return [translate({ ...field, wrapperClassName: `${span} ${rest}`.trim() })];
    });
  const shows = (name: string) => {
    const field = byName.get(name);
    return !!field && (!field.showWhen || evaluateConditions(field.showWhen, values, ''));
  };

  const documentFields = pick(
    ['titleNumber', 'col-span-12 sm:col-span-6'],
    ['bookNumber', 'col-span-6 sm:col-span-3'],
    ['pageNumber', 'col-span-6 sm:col-span-3'],
  );
  const positionFields = pick(
    ['rawang', 'col-span-12 sm:col-span-6'],
    // The aerial photo's name, number and sheet read as one reference, so they share a row.
    ['aerialMapName', 'col-span-12 sm:col-span-6'],
    ['aerialMapNumber', 'col-span-6 sm:col-span-3'],
    ['mapSheetNumber', 'col-span-6 sm:col-span-3'],
    ['landParcelNumber', 'col-span-6 sm:col-span-3'],
    ['surveyNumber', 'col-span-6 sm:col-span-3'],
  );
  const areaFields = pick(
    ['rai', 'col-span-4 sm:col-span-2'],
    ['ngan', 'col-span-4 sm:col-span-2'],
    ['squareWa', 'col-span-4 sm:col-span-2'],
  );
  const hasPosition = ['rawang', 'landParcelNumber', 'surveyNumber', 'aerialMapName'].some(shows);

  return (
    <div className="grid content-start gap-5 p-6">
      <Section title={t('titleEntry.sections.document.title')}>
        <div className="grid grid-cols-12 gap-3.5">
          <FormFields fields={documentFields} />
        </div>
      </Section>

      {hasPosition && (
        <Section title={t('titleEntry.sections.position.title')}>
          <div className="grid grid-cols-12 gap-3.5">
            <FormFields fields={positionFields} />
          </div>
        </Section>
      )}

      <Section title={t('titleEntry.sections.area.title')}>
        <AreaInput fields={areaFields} />
      </Section>
    </div>
  );
}
