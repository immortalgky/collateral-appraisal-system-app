import type { ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormFields, type FormField } from '@/shared/components/form';
import { evaluateConditions } from '@/shared/components/form/conditions';
import { toSquareWa } from '@/shared/utils/landArea';
import { AREA_ORDER, DOCUMENT_ORDER, POSITION_ORDER } from './titleScreenOrder';

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
  // The request page names the area parts after its DTO.
  areaRai: 'titleEntry.area.rai',
  areaNgan: 'titleEntry.area.ngan',
  areaSquareWa: 'titleEntry.area.wa',
} as const;

const DOCUMENT_SPANS: Record<(typeof DOCUMENT_ORDER)[number], string> = {
  titleNumber: 'col-span-12 sm:col-span-6',
  bookNumber: 'col-span-6 sm:col-span-3',
  pageNumber: 'col-span-6 sm:col-span-3',
};
// The aerial photo's name, number and sheet read as one reference, so they share a row.
const POSITION_SPANS: Record<(typeof POSITION_ORDER)[number], string> = {
  rawang: 'col-span-12 sm:col-span-6',
  aerialMapName: 'col-span-12 sm:col-span-6',
  aerialMapNumber: 'col-span-6 sm:col-span-3',
  mapSheetNumber: 'col-span-6 sm:col-span-3',
  landParcelNumber: 'col-span-6 sm:col-span-3',
  surveyNumber: 'col-span-6 sm:col-span-3',
};

/** Where the title lives when it is one row of an array in the page's form (the request's `titles`). */
export interface TitleFormScope {
  name: string;
  index: number;
}

/** Config names of the three area parts, where a page names them differently from the land page. */
export interface TitleFormAreaNames {
  rai: string;
  ngan: string;
  squareWa: string;
}

const LAND_AREA_NAMES: TitleFormAreaNames = { rai: 'rai', ngan: 'ngan', squareWa: 'squareWa' };

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

/** A section: its title above the fields (left out where the page has its own headings). */
function Section({
  title,
  showTitle = true,
  children,
}: {
  title: string;
  showTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2" aria-label={showTitle ? undefined : title}>
      {showTitle && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
      {children}
    </section>
  );
}

/**
 * Rai, ngan and wa through the shared number inputs, so the config's digit, decimal and max limits
 * apply as they always have, with the total read out at the end of the row.
 */
function AreaInput({
  fields,
  scope,
  areaNames,
}: {
  fields: FormField[];
  scope?: TitleFormScope;
  areaNames: TitleFormAreaNames;
}) {
  const { t } = useTranslation('appraisal');
  const { control } = useFormContext();
  const prefix = scope ? `${scope.name}.${scope.index}.` : '';
  const [rai, ngan, squareWa] = useWatch({
    control,
    name: [areaNames.rai, areaNames.ngan, areaNames.squareWa].map(name => `${prefix}${name}`),
  }) as unknown[];
  // Always from the three parts, as the paper totals them: a stored total can be stale.
  const totalWa = toSquareWa(rai, ngan, squareWa);

  return (
    <div className="grid grid-cols-12 items-end gap-3.5">
      <FormFields fields={fields} namePrefix={scope?.name} index={scope?.index} />
      <div className="col-span-12 text-right leading-tight tabular-nums sm:col-span-6">
        <div className="text-base font-semibold text-gray-900">
          {t('titleEntry.area.total', { wa: money(totalWa) })}
        </div>
        <div className="text-xs text-gray-500">
          {t('titleEntry.area.asRai', { rnw: toRaiNganWa(totalWa) })}
        </div>
      </div>
    </div>
  );
}

interface TitleFormViewProps {
  fields: FormField[];
  /** Set when the title is one row of an array in the page's form; see {@link TitleFormScope}. */
  scope?: TitleFormScope;
  /** The area fields' config names; defaults to the land page's `rai` / `ngan` / `squareWa`. */
  areaNames?: TitleFormAreaNames;
  /** Replaces the dialog's own padding, for a page that places the view inside its own layout. */
  className?: string;
  /** The "document / position / area" headings above the groups; off where the page has none. */
  showGroupTitles?: boolean;
}

export function TitleFormView({
  fields,
  scope,
  areaNames = LAND_AREA_NAMES,
  className = 'p-6',
  showGroupTitles = true,
}: TitleFormViewProps) {
  const { t } = useTranslation('appraisal');
  const translate = useTitleFieldLabels();
  const { control } = useFormContext();
  const values = (useWatch({
    control,
    name: scope ? (`${scope.name}.${scope.index}` as never) : undefined,
  }) ?? {}) as Record<string, unknown>;
  const rows = { namePrefix: scope?.name, index: scope?.index };
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

  // The order of each group is the shared screen order (titleScreenOrder); only the widths live here.
  const documentFields = pick(
    ...DOCUMENT_ORDER.map((name): [string, string] => [name, DOCUMENT_SPANS[name]]),
  );
  const positionFields = pick(
    ...POSITION_ORDER.map((name): [string, string] => [name, POSITION_SPANS[name]]),
  );
  const areaFields = pick(
    ...AREA_ORDER.map((name): [string, string] => [areaNames[name], 'col-span-4 sm:col-span-2']),
  );
  const hasPosition = ['rawang', 'landParcelNumber', 'surveyNumber', 'aerialMapName'].some(shows);

  return (
    <div className={`grid content-start gap-5 ${className}`.trim()}>
      <Section title={t('titleEntry.sections.document.title')} showTitle={showGroupTitles}>
        <div className="grid grid-cols-12 gap-3.5">
          <FormFields fields={documentFields} {...rows} />
        </div>
      </Section>

      {hasPosition && (
        <Section title={t('titleEntry.sections.position.title')} showTitle={showGroupTitles}>
          <div className="grid grid-cols-12 gap-3.5">
            <FormFields fields={positionFields} {...rows} />
          </div>
        </Section>
      )}

      <Section title={t('titleEntry.sections.area.title')} showTitle={showGroupTitles}>
        <AreaInput fields={areaFields} scope={scope} areaNames={areaNames} />
      </Section>
    </div>
  );
}
