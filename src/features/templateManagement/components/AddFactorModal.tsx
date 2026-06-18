import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Checkbox from '@shared/components/inputs/Checkbox';
import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';
import clsx from 'clsx';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';

interface SelectedFactor {
  factorId: string;
  isMandatory: boolean;
  isCalculationFactor: boolean;
}

interface SelectedState {
  isMandatory: boolean;
  isCalculationFactor: boolean;
}

interface AddFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  factors: MarketComparableFactorDtoType[];
  excludeFactorIds: string[];
  onAdd: (selections: SelectedFactor[]) => void;
  isAdding?: boolean;
}

const AddFactorModal = ({
  isOpen,
  onClose,
  factors,
  excludeFactorIds,
  onAdd,
  isAdding,
}: AddFactorModalProps) => {
  const { t } = useTranslation(['templateManagement', 'common']);
  const language = useLocaleStore(s => s.language);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, SelectedState>>(new Map());

  const availableFactors = factors.filter(f => f.isActive && !excludeFactorIds.includes(f.id));

  const filtered = availableFactors.filter(
    f =>
      f.factorCode.toLowerCase().includes(search.toLowerCase()) ||
      getTranslatedFactorName(f.translations, language)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const toggleSelect = (factorId: string) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(factorId)) {
        next.delete(factorId);
      } else {
        next.set(factorId, { isMandatory: false, isCalculationFactor: false });
      }
      return next;
    });
  };

  const toggleMandatory = (factorId: string, isMandatory: boolean) => {
    setSelected(prev => {
      const next = new Map(prev);
      const current = next.get(factorId);
      if (current) next.set(factorId, { ...current, isMandatory });
      return next;
    });
  };

  const toggleCalculation = (factorId: string, isCalculationFactor: boolean) => {
    setSelected(prev => {
      const next = new Map(prev);
      const current = next.get(factorId);
      if (current) next.set(factorId, { ...current, isCalculationFactor });
      return next;
    });
  };

  const handleAdd = () => {
    const selections = Array.from(selected.entries()).map(([factorId, state]) => ({
      factorId,
      isMandatory: state.isMandatory,
      isCalculationFactor: state.isCalculationFactor,
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
    setSelected(prev => {
      const next = new Map(prev);
      for (const f of filtered) {
        if (!next.has(f.id)) next.set(f.id, { isMandatory: false, isCalculationFactor: false });
      }
      return next;
    });
  };

  const deselectAll = () => {
    setSelected(new Map());
  };

  const selectedCount = selected.size;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('addFactorModal.title')} size="xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('addFactorModal.searchPlaceholder')}
            aria-label={t('addFactorModal.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={selectAll}>
          {t('addFactorModal.selectAll')}
        </Button>
        {selectedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            {t('addFactorModal.deselectAll')}
          </Button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {t('addFactorModal.noFactors')}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-center w-10" />
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-left">
                  {t('addFactorModal.columns.code')}
                </th>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-left">
                  {t('addFactorModal.columns.name')}
                </th>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-left">
                  {t('addFactorModal.columns.dataType')}
                </th>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-center">
                  {t('addFactorModal.columns.mandatory')}
                </th>
                <th className="text-xs font-semibold text-gray-500 py-2 px-3 text-center">
                  {t('addFactorModal.columns.calculation')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(factor => {
                const isSelected = selected.has(factor.id);
                const state = selected.get(factor.id);
                return (
                  <tr
                    key={factor.id}
                    className={clsx(
                      'border-t border-gray-100 transition-colors cursor-pointer',
                      isSelected ? 'bg-primary/5' : 'hover:bg-gray-50',
                    )}
                    onClick={() => toggleSelect(factor.id)}
                  >
                    <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onChange={() => toggleSelect(factor.id)} />
                    </td>
                    <td className="py-2 px-3 text-sm font-mono text-gray-700">
                      {factor.factorCode}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-900">
                      {getTranslatedFactorName(factor.translations, language)}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-600">{factor.dataType}</td>
                    <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                      {isSelected && (
                        <Checkbox
                          checked={state?.isMandatory ?? false}
                          onChange={checked => toggleMandatory(factor.id, checked)}
                        />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                      {isSelected && (
                        <Checkbox
                          checked={state?.isCalculationFactor ?? false}
                          onChange={checked => toggleCalculation(factor.id, checked)}
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
          {selectedCount > 0
            ? t('addFactorModal.selectedCount', { n: selectedCount })
            : t('addFactorModal.selectPrompt')}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={selectedCount === 0 || isAdding}
            isLoading={isAdding}
            onClick={handleAdd}
          >
            {selectedCount > 0
              ? t('addFactorModal.addButtonWithCount', { n: selectedCount })
              : t('addFactorModal.addButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddFactorModal;
