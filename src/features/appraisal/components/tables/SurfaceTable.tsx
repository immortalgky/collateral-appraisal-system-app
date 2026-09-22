import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useState, useCallback } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import SurfaceInputModal, { type SurfaceData } from './SurfaceInputModal';

interface SurfaceTableProps {
  name: string;
  headers?: SurfaceTableHeader[]; // Keep for backwards compatibility but not used in new design
}

type SurfaceTableHeader = SurfaceTableRegularHeader | SurfaceTableRowNumberHeader;

interface SurfaceTableRegularHeader {
  name: string;
  label: string;
  inputType?: 'text' | 'number' | 'dropdown';
  options?: { label: string; value: string }[];
}

interface SurfaceTableRowNumberHeader {
  rowNumberColumn: true;
  label: string;
}

const formatFloorRange = (from: number | null, to: number | null) => {
  if (from === null && to === null) return '-';
  if (from === to) return `Floor ${from}`;
  if (from === null) return `Floor ${to}`;
  if (to === null) return `Floor ${from}`;
  return `Floor ${from} - ${to}`;
};

const floorCount = (from: number | null, to: number | null) =>
  from != null && to != null && to >= from ? to - from + 1 : null;

/** A small stack of bars, one per floor up to four — reads as "how tall" at a glance. */
const FloorGlyph = ({ count, muted = false }: { count: number; muted?: boolean }) => (
  <span className="grid h-5 w-4 shrink-0 content-end gap-0.5" aria-hidden>
    {Array.from({ length: Math.min(Math.max(count, 1), 4) }, (_, i) => (
      <i
        key={i}
        className={
          muted
            ? 'h-[3px] rounded-[1px] bg-gray-300'
            : `h-[3px] rounded-[1px] bg-primary-500 ${i > 0 ? 'opacity-55' : ''}`
        }
      />
    ))}
  </span>
);

const SurfaceTable = ({ name }: SurfaceTableProps) => {
  const { control } = useFormContext();
  const { append, remove, update } = useFieldArray({
    control,
    name: name,
  });
  const formReadOnly = useFormReadOnly();

  const values = useWatch({ name, control }) || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  const handleAddClick = useCallback(() => {
    setEditIndex(null);
    setModalMode('add');
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((index: number) => {
    setEditIndex(index);
    setModalMode('edit');
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditIndex(null);
  }, []);

  const handleModalSave = useCallback(
    (data: SurfaceData) => {
      if (modalMode === 'add') {
        append(data);
      } else if (editIndex !== null) {
        update(editIndex, data);
      }
    },
    [modalMode, editIndex, append, update],
  );

  const handleModalDelete = useCallback(() => {
    if (editIndex !== null) remove(editIndex);
  }, [editIndex, remove]);

  const getInitialData = (): SurfaceData | null => {
    if (editIndex !== null && values[editIndex]) {
      return values[editIndex];
    }
    return null;
  };

  const isEmpty = values.length === 0;

  const formatFloorOther = (group: string, code: string | null, valueOther: string | null) => {
    if (code === '99') {
      return (
        <>
          {valueOther || 'Others'}
          <span className="ml-1.5 rounded border border-gray-200 bg-gray-50 px-1.5 text-[11px] font-semibold text-gray-400">
            Other
          </span>
        </>
      );
    }
    return <ParameterDisplay group={group} code={code} />;
  };

  // "Covers floors 1–3 · 2 ranges": whether every floor is filled in, without reading each row.
  const floors = new Set<number>();
  (values as SurfaceData[]).forEach(row => {
    const count = floorCount(row.fromFloorNumber, row.toFloorNumber);
    // A range over 500 floors is a typo, not a building — skip it rather than loop over it.
    if (count == null || count > 500) return;
    for (let f = row.fromFloorNumber!; f <= row.toFloorNumber!; f++) floors.add(f);
  });
  const sorted = [...floors].sort((a, b) => a - b);
  const contiguous =
    sorted.length > 0 && sorted[sorted.length - 1] - sorted[0] + 1 === sorted.length;
  const coverage =
    sorted.length === 0
      ? null
      : contiguous
        ? `Covers floor${sorted.length > 1 ? `s ${sorted[0]}–${sorted[sorted.length - 1]}` : ` ${sorted[0]}`}`
        : `Covers ${sorted.length} floors`;

  return (
    <div className="col-span-12">
      {/* data-field: scroll target for array-level errors (see form/utils.ts). Kept on an empty
          anchor rather than the card: formLayout.css restyles any [data-field] that wraps a table. */}
      <div data-field={name} className="cas-repeater" />
      <div className="cas-table-card overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Floor surfaces</h3>
            <p className="text-xs text-gray-500">
              {isEmpty
                ? 'Floor type, structure and finish by floor range'
                : [coverage, `${values.length} ${values.length === 1 ? 'range' : 'ranges'}`]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          </div>
          {!formReadOnly && (
            <button
              type="button"
              onClick={handleAddClick}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add surface
            </button>
          )}
        </div>
        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="w-10 px-3 py-2 text-center font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Floors</th>
                <th className="px-3 py-2 font-semibold">Floor Type</th>
                <th className="px-3 py-2 font-semibold">Structure</th>
                <th className="px-3 py-2 font-semibold">Surface</th>
                <th className="w-8" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {isEmpty && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FloorGlyph count={3} muted />
                      <p className="text-sm text-gray-500">No surface data yet</p>
                      {!formReadOnly && (
                        <button
                          type="button"
                          onClick={handleAddClick}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          + Add first surface
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {values.map((row: SurfaceData, index: number) => {
                const count = floorCount(row.fromFloorNumber, row.toFloorNumber);
                return (
                  <tr
                    key={index}
                    tabIndex={0}
                    onClick={() => handleEditClick(index)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEditClick(index);
                      }
                    }}
                    className="group cursor-pointer border-b border-gray-100 outline-none last:border-b-0 hover:bg-gray-50 focus-visible:bg-primary-50"
                  >
                    <td className="px-3 py-1.5 text-center tabular-nums text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-3">
                        <FloorGlyph count={count ?? 1} />
                        <div>
                          <div className="font-semibold tabular-nums text-gray-900">
                            {formatFloorRange(row.fromFloorNumber, row.toFloorNumber)}
                          </div>
                          {count != null && (
                            <div className="text-[11px] leading-tight text-gray-400">
                              {count} {count === 1 ? 'floor' : 'floors'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-gray-900">
                      {row.floorType ? (
                        <span className="rounded-full border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-600">
                          <ParameterDisplay group="FloorType" code={row.floorType} />
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-gray-900">
                      {formatFloorOther(
                        'floorStructure',
                        row.floorStructureType,
                        row.floorStructureTypeOther,
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-gray-900">
                      {formatFloorOther(
                        'floorSurface',
                        row.floorSurfaceType,
                        row.floorSurfaceTypeOther,
                      )}
                    </td>
                    <td className="pr-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                      <Icon style="solid" name="chevron-right" className="size-3" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SurfaceInputModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        initialData={getInitialData()}
        existing={values}
        editIndex={editIndex}
        mode={modalMode}
      />
    </div>
  );
};

export default SurfaceTable;
