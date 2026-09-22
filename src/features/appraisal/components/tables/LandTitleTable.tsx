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

  return (
    <>
      {/* The section header lives here so its add button can open this table's dialog. It sits in
          the header rather than under the table, so adding stays in reach however long the list. */}
      <div className="cas-section-head mb-2 flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <Icon style="solid" name="file-contract" className="size-3.5 text-primary-600" />
        </div>
        <span className="shrink-0 text-sm font-medium leading-tight text-gray-700">
          Title Detail
        </span>
        {/* The totals used to be a pinned footer row; up here they stay in view with the header
            and cost the table no height. A div, not a span: the grid layout restyles header spans
            as the section title. */}
        {values.length > 0 && (
          <div className="min-w-0 truncate text-xs tabular-nums text-gray-500">
            {t('titleEntry.list.total', { count: values.length })} ·{' '}
            {t('titleEntry.list.rai', { rnw: toRaiNganWa(grandTotalWa) })} (
            {t('titleEntry.list.wa', { wa: formatNumber(grandTotalWa, 2) })})
          </div>
        )}
        {!readOnly && values.length > 0 && (
          <button
            type="button"
            onClick={() => setModalState({ type: 'add' })}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon style="solid" name="plus" className="size-2.5" />
            {t('titleEntry.list.add')}
          </button>
        )}
      </div>
      {/* data-field: scroll target for array-level errors on this table (see form/utils.ts).
          cas-repeater: tells the grid layout this data-field is a table, not a labelled field. It
          cannot be detected with `:has(table)` because that is false while the table is empty. */}
      <div data-field={name} className="cas-repeater flex w-full min-w-0 flex-col">
        {values.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10">
            <Icon name="file-lines" style="regular" className="mb-2 text-3xl text-gray-300" />
            <p className="text-sm font-medium text-gray-500">{t('titleEntry.list.empty')}</p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setModalState({ type: 'add' })}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600"
              >
                <Icon style="solid" name="plus" className="size-2.5" />
                {t('titleEntry.list.add')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Many parcels scroll inside the box; the header stays pinned. The cells are
              sticky, not thead/tfoot, and paint their own ground: a pinned row's background does not
              cover what scrolls beneath it. The grid layout clears cell fills, so formLayout.css gives
              a `.sticky` cell its ground back. `[flex-wrap:wrap]` below rather than `flex-wrap`: the
              grid layout treats any `.flex-wrap` in a field as a chip group, which shrank this box. */}
            <div className="max-h-[28rem] min-w-0 self-stretch overflow-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                    <th className="sticky top-0 z-10 bg-gray-50 w-10 px-3 py-2">#</th>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2">
                      {t('titleEntry.list.type')}
                    </th>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2">
                      {t('titleEntry.list.document')}
                    </th>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2">
                      {t('titleEntry.list.position')}
                    </th>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-right">
                      {t('titleEntry.list.area')}
                    </th>
                    {!readOnly && <th className="sticky top-0 z-10 bg-gray-50 w-20 px-3 py-2" />}
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
                        className="cursor-pointer border-t border-gray-100 align-middle outline-none hover:bg-gray-50 focus-visible:bg-primary-50/50"
                      >
                        <td className="px-3 py-2.5 tabular-nums text-gray-400">{index + 1}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
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
                        <td className="px-3 py-2.5">
                          <div className="break-all font-semibold tabular-nums text-gray-900">
                            {hasValue(row.titleNumber) ? String(row.titleNumber) : '—'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t('titleEntry.list.bookPage', {
                              book: hasValue(row.bookNumber) ? row.bookNumber : '—',
                              page: hasValue(row.pageNumber) ? row.pageNumber : '—',
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {positions.length === 0 ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <div className="flex gap-x-3 gap-y-0.5 text-xs text-gray-500 [flex-wrap:wrap]">
                              {positions.map(([field, key]) => (
                                <span key={field} className="whitespace-nowrap">
                                  {t(key)}{' '}
                                  <b className="font-medium text-gray-800">{String(row[field])}</b>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                          <div className="font-semibold text-gray-900">
                            {t('titleEntry.list.rai', { rnw: toRaiNganWa(totalWa) })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t('titleEntry.list.wa', { wa: formatNumber(totalWa, 2) })}
                          </div>
                        </td>
                        {!readOnly && (
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  open(index);
                                }}
                                className="flex size-7 items-center justify-center rounded text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
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
                                className="flex size-7 items-center justify-center rounded text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
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
    </>
  );
};

export default LandTitleTable;
