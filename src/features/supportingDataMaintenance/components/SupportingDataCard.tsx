import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { collateralTypeOptions } from '../constants/parameters';

export function SupportingDataCard({
  index,
  isSelected,
  isCompleted,
  isReadOnly,
  data,
  onSelectSupportingData,
  onDeleteSupportingData,
}: {
  index: number;
  isSelected: boolean;
  isCompleted: boolean;
  isReadOnly: boolean;
  data: any;
  onSelectSupportingData: () => void;
  onDeleteSupportingData: () => void;
}) {
  const getCollateralTypeLabel = (type: string | undefined) => {
    const option = collateralTypeOptions.find(opt => opt.value === type);
    return option?.label || 'New Title';
  };

  const getCollateralTypeIcon = (type: string | undefined) => {
    if (!type) return 'file-circle-question';
    // Land family
    if (['01', '13', '14', '17', '19', '21', '26', '27'].includes(type)) return 'mountain-sun';
    // Land+Building family
    if (['02', '03', '04', '23', '24', '32'].includes(type)) return 'city';
    // Building family
    if (['05', '06', '07', '15', '16', '18', '20', '22'].includes(type)) return 'building';
    // Condo family
    if (['08', '33'].includes(type)) return 'building-user';
    // Vehicle
    if (type === '10') return 'car';
    // Machine
    if (type === '11') return 'gear';
    // Vessel
    if (type === '12') return 'ship';
    // Lease land
    if (type === '29') return 'file-contract';
    // Lease land+building
    if (['09', '25', '30', '31'].includes(type)) return 'file-signature';
    // Lease condo
    if (type === '28') return 'file-lines';
    return 'file-circle-question';
  };

  const mode = isSelected ? 'card' : 'list';

  return (
    <div
      key={data.id}
      className={clsx(
        'group relative flex items-center gap-2 p-2 rounded-lg text-left transition-all cursor-pointer',
        isSelected
          ? 'bg-primary/10 border border-primary shadow-sm'
          : 'bg-gray-50 border border-transparent hover:bg-gray-100 hover:border-gray-200',
      )}
      onClick={onSelectSupportingData}
    >
      {/* Index Badge */}
      <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-gray-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
        {index + 1}
      </div>

      <div
        className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          'bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10',
        )}
      >
        <Icon
          style="solid"
          name={getCollateralTypeIcon(data?.collateralType)}
          className="size-4.5 text-primary"
        />
      </div>

      {/* Validation Status Indicator */}
      <div
        className={clsx(
          'absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm',
          isCompleted ? 'bg-success text-white' : 'bg-amber-400 text-white',
        )}
      >
        <Icon style="solid" name={isCompleted ? 'check' : 'exclamation'} className="size-1.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-gray-400 truncate">{data?.propertyName || 'Untitled'}</div>
        <div className="text-[8px] text-gray-400 truncate">
          location: {data?.latitude || '-'} - {data?.longitude || '-'}
        </div>
        <div className="text-[8px] text-gray-400 truncate">
          {data?.collateralType ? getCollateralTypeLabel(data.collateralType) : ''}
        </div>
      </div>

      {/* Delete button - visible on hover (hidden in readOnly) */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDeleteSupportingData();
          }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded bg-danger/10 text-danger hover:bg-danger/20 transition-all shrink-0"
          title="Delete"
        >
          <Icon style="solid" name="xmark" className="size-2.5" />
        </button>
      )}
    </div>
  );
}
