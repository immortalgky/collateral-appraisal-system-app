import { useState } from 'react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Checkbox from '@shared/components/inputs/Checkbox';
import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';
import clsx from 'clsx';

interface SelectedFactor {
  factorId: string;
  isMandatory: boolean;
}

interface AddFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  factors: MarketComparableFactorDtoType[];
  excludeFactorIds: string[];
  onAdd: (selections: SelectedFactor[]) => void;
  isAdding?: boolean;
}

const AddFactorModal = ({ isOpen, onClose, factors, excludeFactorIds, onAdd, isAdding }: AddFactorModalProps) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, boolean>>(new Map());

  const availableFactors = factors.filter(
    (f) => f.isActive && !excludeFactorIds.includes(f.id),
  );

  const filtered = availableFactors.filter(
    (f) =>
      f.factorCode.toLowerCase().includes(search.toLowerCase()) ||
      f.factorName.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelect = (factorId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(factorId)) {
        next.delete(factorId);
      } else {
        next.set(factorId, false);
      }
      return next;
    });
  };

  const toggleMandatory = (factorId: string, isMandatory: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(factorId, isMandatory);
      return next;
    });
  };

  const handleAdd = () => {
    const selections = Array.from(selected.entries()).map(([factorId, isMandatory]) => ({
      factorId,
      isMandatory,
    }));
    onAdd(selections);
    setSelected(new Map());
    setSearch('');
  };

  const handleClose = () => {
    setSelected(new Map());
    setSearch('');
    onClose();
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const f of filtered) {
        if (!next.has(f.id)) next.set(f.id, false);
      }
      return next;
    });
  };

  const deselectAll = () => {
    setSelected(new Map());
  };

  const selectedCount = selected.size;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Factors" size="xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Icon name="magnifying-glass" style="regular" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={selectAll}>
          Select All
        </Button>
        {selectedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            Clear
          </Button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No available factors found
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-center w-10" />
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-left">Code</th>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-left">Name</th>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-left">Data Type</th>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-center">Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((factor) => {
                const isSelected = selected.has(factor.id);
                const isMandatory = selected.get(factor.id) ?? false;
                return (
                  <tr
                    key={factor.id}
                    className={clsx(
                      'border-t border-gray-100 transition-colors cursor-pointer',
                      isSelected ? 'bg-primary/5' : 'hover:bg-gray-50',
                    )}
                    onClick={() => toggleSelect(factor.id)}
                  >
                    <td className="py-2 px-3 text-center">
                      <Checkbox checked={isSelected} onChange={() => toggleSelect(factor.id)} />
                    </td>
                    <td className="py-2 px-3 text-sm font-mono text-gray-700">{factor.factorCode}</td>
                    <td className="py-2 px-3 text-sm text-gray-900">{factor.factorName}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">{factor.dataType}</td>
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {isSelected && (
                        <Checkbox
                          checked={isMandatory}
                          onChange={(checked) => toggleMandatory(factor.id, checked)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">
          {selectedCount > 0 ? `${selectedCount} factor(s) selected` : 'Select factors to add'}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={selectedCount === 0 || isAdding}
            isLoading={isAdding}
            onClick={handleAdd}
          >
            Add {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddFactorModal;
