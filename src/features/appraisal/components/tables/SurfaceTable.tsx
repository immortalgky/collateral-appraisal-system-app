import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useFieldArray, useFormContext, useWatch, Controller } from 'react-hook-form';
import Icon from '@/shared/components/Icon';
import ConfirmDeleteButton from '@/shared/components/ConfirmDeleteButton';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useParameterOptions } from '@/shared/utils/parameterUtils';
import TDropdown from '@/features/pricingAnalysis/components/table/TDropdown';
import { FIELD, NumCell, TD, TH } from './denseTable';

export interface SurfaceData {
  fromFloorNumber: number | null;
  toFloorNumber: number | null;
  floorType: string;
  floorStructureType: string;
  floorStructureTypeOther: string;
  floorSurfaceType: string;
  floorSurfaceTypeOther: string;
}

interface SurfaceTableProps {
  name: string;
  headers?: unknown[]; // Kept for backwards compatibility, not used.
}

/** The parameter code every group uses for "Other — specify". */
const OTHER = '99';

const floorText = (from: number | null, to: number | null) =>
  from === to ? `${from}` : `${from}–${to}`;

const SurfaceTable = ({ name }: SurfaceTableProps) => {
  const { t } = useTranslation('appraisal');
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const formReadOnly = useFormReadOnly();
  const values: SurfaceData[] = useWatch({ name, control }) || [];

  const optionsByGroup = {
    FloorType: useParameterOptions('FloorType'),
    FloorStructure: useParameterOptions('FloorStructure'),
    FloorSurface: useParameterOptions('FloorSurface'),
  };
  // Inactive codes stay hidden unless the row already carries one, as the slide-over did.
  const optionsFor = (group: keyof typeof optionsByGroup, current: string) =>
    optionsByGroup[group]
      .filter(o => o.isActive !== false || o.value === current)
      .map(o => ({ value: o.value ?? undefined, label: o.label }));

  const handleAdd = () => {
    const last = values[values.length - 1];
    const next = last?.toFloorNumber != null ? last.toFloorNumber + 1 : 1;
    append({
      fromFloorNumber: next,
      toFloorNumber: next,
      floorType: '',
      floorStructureType: '',
      floorStructureTypeOther: '',
      floorSurfaceType: '',
      floorSurfaceTypeOther: '',
    });
  };

  // Warnings, not errors: neither was ever enforced, and saved rows may already look like this.
  const warningFor = (row: SurfaceData, index: number) => {
    const from = row.fromFloorNumber;
    const to = row.toFloorNumber;
    if (from == null || to == null) return null;
    if (to < from) return t('surfaceTable.reversed');
    const overlaps = values.filter(
      (other, i) =>
        i !== index &&
        other.fromFloorNumber != null &&
        other.toFloorNumber != null &&
        other.fromFloorNumber <= to &&
        from <= other.toFloorNumber,
    );
    return overlaps.length
      ? t('surfaceTable.overlap', {
          floors: overlaps.map(o => floorText(o.fromFloorNumber, o.toFloorNumber)).join(', '),
        })
      : null;
  };

  const columnCount = formReadOnly ? 5 : 6;

  const isEmpty = fields.length === 0;

  const addButton = !formReadOnly && (
    <button
      type="button"
      onClick={handleAdd}
      className="inline-flex items-center rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[0.75rem] text-gray-600 hover:border-primary-500 hover:text-primary-700"
    >
      + {t('surfaceTable.addFloor')}
    </button>
  );

  const paramCell = (
    path: string,
    group: keyof typeof optionsByGroup,
    current: string,
    otherField?: string,
    otherValue?: string,
  ) => (
    <div className="flex flex-col gap-1">
      {formReadOnly ? (
        <ParameterDisplay group={group} code={current} />
      ) : (
        <Controller
          name={path}
          control={control}
          render={({ field: f }) => (
            <TDropdown
              dense
              showValue={false}
              placeholder="-"
              options={optionsFor(group, current)}
              value={f.value || null}
              onChange={v => f.onChange(v ?? '')}
            />
          )}
        />
      )}
      {otherField &&
        current === OTHER &&
        (formReadOnly ? (
          <span className="text-gray-500">{otherValue}</span>
        ) : (
          <input
            {...register(otherField)}
            maxLength={100}
            placeholder={t('surfaceTable.otherPlaceholder')}
            className={FIELD}
          />
        ))}
    </div>
  );

  return (
    <div className="col-span-12">
      {/* data-field: scroll target for array-level errors (see form/utils.ts). Kept on an empty
          anchor rather than the card: formLayout.css restyles any [data-field] that wraps a table. */}
      <div data-field={name} className="cas-repeater" />
      <div className="cas-labelled-table">
        {/* The band: title, a muted count and the add link (hidden outside `.cas-form-grid`, where the
            button under the table, its twin, shows). */}
        <div className="cas-table-label">
          {t('surfaceTable.sectionLabel')}
          {!isEmpty && (
            <>
              <span className="cas-label-meta">
                {t('surfaceTable.itemCount', { count: fields.length })}
              </span>
              {!formReadOnly && (
                <button type="button" onClick={handleAdd} className="cas-label-add">
                  + {t('surfaceTable.addFloor')}
                </button>
              )}
            </>
          )}
        </div>
        <div className="cas-table-card min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <p className="text-sm text-gray-500">{t('surfaceTable.empty')}</p>
              {addButton}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-[0.875rem] leading-tight tabular-nums">
                  <thead className="bg-[#f8fafa] text-[0.8125rem] font-medium text-[#55636f]">
                    <tr>
                      <th className={clsx(TH, 'w-[90px] text-right')}>
                        {t('fieldLabels.building.fromFloorNumber')}
                      </th>
                      <th className={clsx(TH, 'w-[90px] text-right')}>
                        {t('fieldLabels.building.toFloorNumber')}
                      </th>
                      <th className={clsx(TH, 'text-left')}>
                        {t('fieldLabels.building.floorType')}
                      </th>
                      <th className={clsx(TH, 'text-left')}>
                        {t('fieldLabels.building.floorStructureType')}
                      </th>
                      <th className={clsx(TH, 'text-left')}>
                        {t('fieldLabels.building.floorSurfaceType')}
                      </th>
                      {!formReadOnly && <th className={clsx(TH, 'w-8')} />}
                    </tr>
                  </thead>
                  <tbody className="text-[#1f2937] dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                    {fields.map((field, index) => {
                      const row = values[index] ?? ({} as SurfaceData);
                      const p = `${name}.${index}`;
                      const warning = warningFor(row, index);
                      return (
                        <Fragment key={field.id}>
                          <tr>
                            <td className={clsx(TD, 'text-right align-top')}>
                              <NumCell
                                name={`${p}.fromFloorNumber`}
                                readOnly={formReadOnly}
                                digits={0}
                                maxInt={3}
                                invalid={!!warning}
                              />
                            </td>
                            <td className={clsx(TD, 'text-right align-top')}>
                              <NumCell
                                name={`${p}.toFloorNumber`}
                                readOnly={formReadOnly}
                                digits={0}
                                maxInt={3}
                                invalid={!!warning}
                              />
                            </td>
                            <td className={clsx(TD, 'align-top')}>
                              {paramCell(`${p}.floorType`, 'FloorType', row.floorType)}
                            </td>
                            <td className={clsx(TD, 'align-top')}>
                              {paramCell(
                                `${p}.floorStructureType`,
                                'FloorStructure',
                                row.floorStructureType,
                                `${p}.floorStructureTypeOther`,
                                row.floorStructureTypeOther,
                              )}
                            </td>
                            <td className={clsx(TD, 'align-top')}>
                              {paramCell(
                                `${p}.floorSurfaceType`,
                                'FloorSurface',
                                row.floorSurfaceType,
                                `${p}.floorSurfaceTypeOther`,
                                row.floorSurfaceTypeOther,
                              )}
                            </td>
                            {!formReadOnly && (
                              <td className={clsx(TD, 'text-center align-top')}>
                                <ConfirmDeleteButton
                                  onConfirm={() => remove(index)}
                                  rowNumber={index + 1}
                                  className="cas-row-btn inline-flex size-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Icon style="solid" name="trash" className="size-3" />
                                </ConfirmDeleteButton>
                              </td>
                            )}
                          </tr>
                          {warning && (
                            <tr>
                              <td
                                colSpan={columnCount}
                                className="px-2 pb-1 text-[0.75rem] text-amber-700"
                              >
                                {warning}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Twin of the band's add link, for outside `.cas-form-grid` (`.cas-outside-form-only` is
                  hidden inside it). Under the table, not in a row of it: an action on the list. */}
              {addButton && <div className="cas-outside-form-only pt-2">{addButton}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurfaceTable;
