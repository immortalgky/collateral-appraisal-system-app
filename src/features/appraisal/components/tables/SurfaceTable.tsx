import Icon from '@/shared/components/Icon';
import { useState, useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
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

// Option mappings for display
const floorTypeLabels: Record<string, string> = {
  CB: 'Cement Block',
  WOOD: 'Wood',
  IRON: 'Iron',
  TILE: 'Tile',
  MARBLE: 'Marble',
  PARQUET: 'Parquet',
};

const floorStructureLabels: Record<string, string> = {
  CB: 'Cement Block',
  WOOD: 'Wood',
  IRON: 'Iron',
  RFC: 'Reinforced Concrete',
  STEEL: 'Steel',
};

const floorSurfaceLabels: Record<string, string> = {
  CB: 'Cement Block',
  WOOD: 'Wood',
  IRON: 'Iron',
  TILE: 'Tile',
  MARBLE: 'Marble',
  PARQUET: 'Parquet',
  VINYL: 'Vinyl',
  LAMINATE: 'Laminate',
};

const SurfaceTable = ({ name }: SurfaceTableProps) => {
  const { control, getValues } = useFormContext();
  const { append, remove, update } = useFieldArray({
    control,
    name: name,
  });

  const values = getValues(name) || [];
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

  const handleRowDoubleClick = useCallback((index: number) => {
    handleEditClick(index);
  }, [handleEditClick]);

  const handleDeleteClick = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

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

  const getInitialData = (): SurfaceData | null => {
    if (editIndex !== null && values[editIndex]) {
      return values[editIndex];
    }
    return null;
  };

  const isEmpty = values.length === 0;

  const formatFloorRange = (from: number | null, to: number | null) => {
    if (from === null && to === null) return '-';
    if (from === to) return `Floor ${from}`;
    if (from === null) return `Floor ${to}`;
    if (to === null) return `Floor ${from}`;
    return `Floor ${from} - ${to}`;
  };

  return (
    <div className="col-span-12">
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="table w-full">
          <thead>
            <tr className="bg-primary-700">
              <th className="text-white text-sm font-medium py-3 px-4 text-left rounded-tl-lg w-12">
                #
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Floor Range
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Floor Type
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Floor Structure
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-left">
                Floor Surface
              </th>
              <th className="text-white text-sm font-medium py-3 px-4 text-right rounded-tr-lg w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isEmpty ? (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Icon style="regular" name="layer-group" className="size-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No surface data yet</p>
                    <button
                      type="button"
                      onClick={handleAddClick}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <Icon style="solid" name="plus" className="size-3.5" />
                      Add first surface
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              values.map((row: SurfaceData, index: number) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onDoubleClick={() => handleRowDoubleClick(index)}
                >
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {formatFloorRange(row.fromFloorNumber, row.toFloorNumber)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {floorTypeLabels[row.floorType] || row.floorType || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {floorStructureLabels[row.floorStructure] || row.floorStructure || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {floorSurfaceLabels[row.floorSurface] || row.floorSurface || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleEditClick(index);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                        title="Edit"
                      >
                        <Icon style="solid" name="pen" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteClick(index);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                        title="Delete"
                      >
                        <Icon style="solid" name="trash" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add button */}
      {!isEmpty && (
        <div className="border-x border-b border-gray-200 rounded-b-lg">
          <button
            type="button"
            onClick={handleAddClick}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 bg-gray-50 hover:bg-primary-50 transition-colors rounded-b-lg"
          >
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
              <Icon style="solid" name="plus" className="size-3 text-white" />
            </div>
            Add surface
          </button>
        </div>
      )}

      {/* Modal */}
      <SurfaceInputModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        initialData={getInitialData()}
        mode={modalMode}
      />
    </div>
  );
};

export default SurfaceTable;
