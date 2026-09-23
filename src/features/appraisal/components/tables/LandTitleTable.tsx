import Icon from '@/shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { type FormField } from '@/shared/components/form';
import { formatNumber } from '@/shared/utils/formatUtils';
import clsx from 'clsx';
import { useState } from 'react';
import { get, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormReadOnly } from '@/shared/components/form/context';
import LandTitleInputModal from '../LandTitleInputModal';
import { toRaiNganWa } from '../TitleFormView';
import { TD, TH } from './denseTable';

interface LandTitleTableProps {
  name: string;
  fields: FormField[];
}

type TitleRow = Record<string, unknown>;

/** The dot beside the type: the same colours as the emblem on the document view. */
const TYPE_DOT: Record<string, string> = {
  DEED: 'bg-[#D69BA1]',
  NS3K: 'bg-[#7FBF95]',
  NS3: 'bg-[#AEB5BA]',
  NS3KO: 'bg-[#AEB5BA]',
};

/**
 * Where the parcel sits, in the order the dialog asks for it. Each title type fills only some of
 * these, so a row shows just the ones it has rather than a column per field left mostly empty.
 */
const POSITION_KEYS = {
  rawang: 'titleEntry.fields.rawang',
  aerialMapName: 'titleEntry.fields.aerialMapName',
  aerialMapNumber: 'titleEntry.fields.aerialMapNumber',
  mapSheetNumber: 'titleEntry.fields.mapSheetNumber',
  landParcelNumber: 'titleEntry.fields.landParcelNumber',
  surveyNumber: 'titleEntry.fields.surveyNumber',
} as const;

/** The header row stays in view while many parcels scroll under it. */
const STICKY = 'sticky top-0 z-10 bg-[#f8fafa]';

const hasValue = (value: unknown) => value != null && String(value).trim() !== '';

/** Always from rai/ngan/wa, never the stored total, which can be stale on older rows. */
const totalWaOf = (row: TitleRow) =>
  (Number(row.rai) || 0) * 400 + (Number(row.ngan) || 0) * 100 + (Number(row.squareWa) || 0);

const LandTitleTable = ({ name, fields }: LandTitleTableProps) => {
  const { t } = useTranslation('appraisal');
  const readOnly = useFormReadOnly();
  const { control, formState } = useFormContext();
  const { append, remove, update } = useFieldArray({ control, name });
  const values = (useWatch({ control, name }) as TitleRow[] | undefined) ?? [];

  const [modalState, setModalState] = useState<
    { type: 'add' } | { type: 'edit'; index: number } | null
  >(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const confirmDelete = () => {
    if (deleteConfirmIndex !== null) {
      remove(deleteConfirmIndex);
      setDeleteConfirmIndex(null);
    }
  };

  const grandTotalWa = values.reduce((sum, row) => sum + totalWaOf(row), 0);
  // Read-only viewers can still open a title; the dialog shows it without a Save button.
  const open = (index: number) => setModalState({ type: 'edit', index });

  const summary = values.length > 0 && (
    <>
      {t('titleEntry.list.total', { count: values.length })} ·{' '}
      {t('titleEntry.list.rai', { rnw: toRaiNganWa(grandTotalWa) })} (
      {t('titleEntry.list.wa', { wa: formatNumber(grandTotalWa, 2) })})
    </>
  );
  const addButton = (className: string) =>
    !readOnly && (
      <button type="button" onClick={() => setModalState({ type: 'add' })} className={className}>
        <Icon style="solid" name="plus" className="size-2.5" />
        {t('titleEntry.list.add')}
      </button>
    );

  return (
    <>
      {/* The section header lives here so its add button can open this table's dialog. It sits in
          the header rather than under the table, so adding stays in reach however long the list. */}
      <div className="cas-section-head mb-2 flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <Icon style="solid" name="file-contract" className="size-3.5 text-primary-600" />
        </div>
        <span className="shrink-0 text-sm font-medium leading-tight text-gray-700">
          {t('titleEntry.sections.document.title')}
        </span>
        {/* The totals used to be a pinned footer row; up here they stay in view with the header
            and cost the table no height. A div, not a span: the grid layout restyles header spans
            as the section title. */}
        {summary && (
          <div className="min-w-0 truncate text-xs tabular-nums text-gray-500">{summary}</div>
        )}
        {values.length > 0 &&
          addButton(
            'cas-hide-in-grid ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          )}
      </div>
      {/* One box for everything under the header, so the grid layout can treat it as the
          section's body (`.cas-section-head + *`). */}
      <div>
        {/* data-field: scroll target for array-level errors on this table (see form/utils.ts). Kept
          on an empty anchor, as the building tables do: a [data-field] that wraps the table gets
          the grid layout's teal repeater look, and this table wears the grey one. */}
        <div data-field={name} className="cas-repeater" />
        <div className="cas-labelled-table">
          <div className="cas-table-label">
            {t('titleEntry.sections.document.title')}
            {addButton(
              'inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-white px-2 py-0.5 text-[0.75rem] font-normal text-gray-600 hover:border-primary-500 hover:text-primary-700',
            )}
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col">
            {values.length === 0 ? (
              <div className="cas-table-card flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10">
                <Icon name="file-lines" style="regular" className="mb-2 text-3xl text-gray-300" />
                <p className="text-sm font-medium text-gray-500">{t('titleEntry.list.empty')}</p>
                {addButton(
                  'cas-hide-in-grid mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600',
                )}
              </div>
            ) : (
              <>
                {/* Many parcels scroll inside the box; the header stays pinned. The cells are
              sticky, not thead/tfoot, and paint their own ground: a pinned row's background does not
              cover what scrolls beneath it. The grid layout clears cell fills, so formLayout.css gives
              a `.sticky` cell its ground back. `[flex-wrap:wrap]` below rather than `flex-wrap`: the
              grid layout treats any `.flex-wrap` in a field as a chip group, which shrank this box. */}
                {/* border-separate: with collapsed borders a sticky header cell leaves its line behind. */}
                <div className="cas-table-card max-h-[28rem] min-w-0 self-stretch overflow-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[0.875rem] leading-tight tabular-nums">
                    <thead className="text-left text-[0.8125rem] font-medium text-[#55636f]">
                      <tr>
                        <th className={clsx(TH, STICKY, 'w-10')}>#</th>
                        <th className={clsx(TH, STICKY)}>{t('titleEntry.list.type')}</th>
                        <th className={clsx(TH, STICKY)}>{t('titleEntry.list.document')}</th>
                        <th className={clsx(TH, STICKY)}>{t('titleEntry.list.position')}</th>
                        <th className={clsx(TH, STICKY, 'text-right')}>
                          {t('titleEntry.list.area')}
                        </th>
                        {!readOnly && <th className={clsx(TH, STICKY, 'w-20')} />}
                      </tr>
                    </thead>
                    <tbody>
                      {values.map((row, index) => {
                        const totalWa = totalWaOf(row);
                        const invalid = !!get(formState.errors, `${name}.${index}`);
                        const positions = Object.entries(POSITION_KEYS).filter(([field]) =>
                          hasValue(row[field]),
                        );
                        return (
                          <tr
                            key={index}
                            tabIndex={0}
                            onClick={() => open(index)}
                            onKeyDown={event => {
                              if (event.target === event.currentTarget && event.key === 'Enter')
                                open(index);
                            }}
                            className="cursor-pointer align-middle outline-none hover:bg-gray-50 focus-visible:bg-primary-50/50"
                          >
                            <td className={clsx(TD, 'text-gray-400')}>{index + 1}</td>
                            <td className={clsx(TD, 'whitespace-nowrap')}>
                              {/* <i>, not <span>: the grid layout restyles a cell's direct `span.rounded-full`. */}
                              <i
                                aria-hidden
                                className={clsx(
                                  'mr-2 inline-block size-2 rounded-full align-middle',
                                  TYPE_DOT[String(row.titleType)] ?? 'bg-gray-300',
                                )}
                              />
                              <ParameterDisplay group="DeedType" code={row.titleType as string} />
                              {invalid && (
                                <div className="mt-0.5 text-xs text-danger">
                                  {t('titleEntry.list.incomplete')}
                                </div>
                              )}
                            </td>
                            <td className={TD}>
                              <span className="break-all font-semibold text-gray-900">
                                {hasValue(row.titleNumber) ? String(row.titleNumber) : '—'}
                              </span>{' '}
                              <span className="text-[0.75rem] text-gray-500">
                                ·{' '}
                                {t('titleEntry.list.bookPage', {
                                  book: hasValue(row.bookNumber) ? row.bookNumber : '—',
                                  page: hasValue(row.pageNumber) ? row.pageNumber : '—',
                                })}
                              </span>
                            </td>
                            <td className={TD}>
                              {positions.length === 0 ? (
                                <span className="text-gray-300">—</span>
                              ) : (
                                <div className="flex gap-x-3 gap-y-0.5 text-[0.75rem] text-gray-500 [flex-wrap:wrap]">
                                  {positions.map(([field, key]) => (
                                    <span key={field} className="whitespace-nowrap">
                                      {t(key)}{' '}
                                      <b className="font-medium text-gray-800">
                                        {String(row[field])}
                                      </b>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className={clsx(TD, 'whitespace-nowrap text-right')}>
                              <span className="font-semibold text-gray-900">
                                {t('titleEntry.list.rai', { rnw: toRaiNganWa(totalWa) })}
                              </span>{' '}
                              <span className="text-[0.75rem] text-gray-500">
                                {t('titleEntry.list.wa', { wa: formatNumber(totalWa, 2) })}
                              </span>
                            </td>
                            {!readOnly && (
                              <td className={clsx(TD, 'py-0.5')}>
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={event => {
                                      event.stopPropagation();
                                      open(index);
                                    }}
                                    className="flex size-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                                    aria-label={t('titleEntry.list.edit')}
                                    title={t('titleEntry.list.edit')}
                                  >
                                    <Icon style="solid" name="pen" className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={event => {
                                      event.stopPropagation();
                                      setDeleteConfirmIndex(index);
                                    }}
                                    className="flex size-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                                    aria-label={t('titleEntry.list.delete')}
                                    title={t('titleEntry.list.delete')}
                                  >
                                    <Icon style="solid" name="trash" className="size-3" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {modalState && (
              <LandTitleInputModal
                readOnly={readOnly}
                fields={fields}
                defaultValues={modalState.type === 'edit' ? values[modalState.index] : undefined}
                onCancel={() => setModalState(null)}
                onSave={data => {
                  if (modalState.type === 'add') {
                    append(data);
                  } else {
                    update(modalState.index, data);
                  }
                  setModalState(null);
                }}
              />
            )}

            <ConfirmDialog
              isOpen={deleteConfirmIndex !== null}
              title={t('titleEntry.list.deleteTitle')}
              message={t('titleEntry.list.deleteMessage')}
              confirmText={t('titleEntry.list.delete')}
              cancelText={t('titleEntry.list.cancel')}
              onConfirm={confirmDelete}
              onClose={() => setDeleteConfirmIndex(null)}
              variant="danger"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default LandTitleTable;
