import type { TFunction } from 'i18next';
import { isCondo } from '@/features/blockProject/types';
import type { ProjectType, ProjectUnitDetail, PurchaseMethod, UnitEditState } from '../types';

interface UnitRowProps {
  unit: ProjectUnitDetail;
  projectType: ProjectType;
  editState: UnitEditState;
  isDirty: boolean;
  isSelected: boolean;
  onToggleSelect: (unitId: string) => void;
  onChange: (unitId: string, patch: Partial<UnitEditState>) => void;
  loanBankListId: string;
  t: TFunction<'blockUnitMaintenance'>;
}

const fmt = (n: number | null | undefined): string =>
  n != null
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '-';

export const UnitRow = ({
  unit,
  projectType,
  editState,
  isDirty,
  isSelected,
  onToggleSelect,
  onChange,
  loanBankListId,
  t,
}: UnitRowProps) => {
  const { isSold, purchaseBy, loanBankName } = editState;

  const handleSoldChange = (checked: boolean) => {
    onChange(unit.id, {
      isSold: checked,
      purchaseBy: checked ? purchaseBy : null,
      loanBankName: checked ? loanBankName : '',
    });
  };

  const handlePurchaseByPick = (next: PurchaseMethod) => {
    onChange(unit.id, {
      purchaseBy: next,
      loanBankName: next === 'Loan' ? loanBankName : '',
    });
  };

  const identityCells = isCondo(projectType) ? (
    <>
      <td className="py-2 px-3 text-gray-600">{unit.sequenceNumber}</td>
      <td className="py-2 px-3 text-gray-800">{unit.floor ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800">{unit.towerName ?? '-'}</td>
      <td className="py-2 px-3 text-gray-600">{unit.condoRegistrationNumber ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800">{unit.roomNumber ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800">{unit.modelType ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800 text-right">{fmt(unit.usableArea)}</td>
      <td className="py-2 px-3 text-gray-800 text-right">{fmt(unit.sellingPrice)}</td>
    </>
  ) : (
    <>
      <td className="py-2 px-3 text-gray-600">{unit.sequenceNumber}</td>
      <td className="py-2 px-3 text-gray-800">{unit.plotNumber ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800">{unit.houseNumber ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800">{unit.modelType ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800">{unit.numberOfFloors ?? '-'}</td>
      <td className="py-2 px-3 text-gray-800 text-right">{fmt(unit.landArea)}</td>
      <td className="py-2 px-3 text-gray-800 text-right">{fmt(unit.usableArea)}</td>
      <td className="py-2 px-3 text-gray-800 text-right">{fmt(unit.sellingPrice)}</td>
    </>
  );

  // Segmented Cash | Loan button group
  const segBtnBase =
    'px-2.5 py-1 text-xs font-medium border first:rounded-l-md last:rounded-r-md focus:outline-none transition-colors';
  const segBtnInactive = 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50';
  const segBtnActive = 'border-primary bg-primary text-white';
  const segBtnDisabled = 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed';

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 ${
        isDirty ? 'bg-amber-50/30' : ''
      } ${isSelected ? 'bg-primary/5' : ''}`}
    >
      {/* Dirty indicator + selection checkbox in one slim column */}
      <td className="py-2 pl-3 pr-1 relative">
        {isDirty && (
          <span
            aria-label={t('detail.dirty')}
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400"
          />
        )}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(unit.id)}
          aria-label={t('units.selectUnit')}
          className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
        />
      </td>
      {identityCells}
      {/* Sold checkbox */}
      <td className="py-2 px-3 text-center">
        <input
          type="checkbox"
          checked={isSold}
          onChange={e => handleSoldChange(e.target.checked)}
          aria-label={t('units.col.isSold')}
          className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
        />
      </td>
      {/* Purchase by — segmented control */}
      <td className="py-2 px-3">
        <div role="group" aria-label={t('units.col.purchaseBy')} className="inline-flex">
          <button
            type="button"
            disabled={!isSold}
            onClick={() => handlePurchaseByPick('Cash')}
            className={`${segBtnBase} ${
              !isSold ? segBtnDisabled : purchaseBy === 'Cash' ? segBtnActive : segBtnInactive
            }`}
          >
            {t('units.purchaseBy.Cash')}
          </button>
          <button
            type="button"
            disabled={!isSold}
            onClick={() => handlePurchaseByPick('Loan')}
            className={`${segBtnBase} -ml-px ${
              !isSold ? segBtnDisabled : purchaseBy === 'Loan' ? segBtnActive : segBtnInactive
            }`}
          >
            {t('units.purchaseBy.Loan')}
          </button>
        </div>
      </td>
      {/* Loan bank name with autocomplete from existing values */}
      <td className="py-2 px-3 min-w-[160px]">
        <input
          type="text"
          list={loanBankListId}
          value={loanBankName}
          onChange={e => onChange(unit.id, { loanBankName: e.target.value })}
          disabled={!isSold || purchaseBy !== 'Loan'}
          placeholder={purchaseBy === 'Loan' && isSold ? t('units.bankNamePlaceholder') : ''}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </td>
    </tr>
  );
};
