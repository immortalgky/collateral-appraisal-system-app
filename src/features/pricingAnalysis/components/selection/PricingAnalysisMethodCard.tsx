import { Icon } from '@/shared/components';
import clsx from 'clsx';
import type { Method } from '../../types/selection';

interface PricingAnalysisMethodCardProps {
  viewMode: 'editing' | 'summary';
  approachId?: string;
  approachType: string;
  method: Method;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
}

export const PricingAnalysisMethodCard = ({
  viewMode,
  approachId,
  approachType,
  method,
  onToggleMethod,
  onSelectCalculationMethod,
  onSelectCandidateMethod,
  onDeleteMethod,
}: PricingAnalysisMethodCardProps) => {
  if (viewMode === 'editing') {
    return (
      <div
        className={clsx(
          'flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200',
          'bg-primary/5 text-primary',
        )}
      >
        <Icon name={method.icon} style="solid" className="size-3 shrink-0" />
        <span className="flex-1 text-left font-medium">{method.label}</span>
        {onDeleteMethod && method.id && (
          <button
            type="button"
            className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMethod({ approachType, methodType: method.methodType });
            }}
          >
            <Icon
              name="trash"
              style="solid"
              className="size-3.5 text-gray-400 hover:text-red-500 transition-colors"
            />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
        'hover:bg-gray-50',
        method.isSelected ? 'text-primary' : 'text-gray-500',
      )}
    >
      {/* Candidate checkbox */}
      <button
        type="button"
        onClick={() =>
          onSelectCandidateMethod({ approachType, methodType: method.methodType })
        }
        className="cursor-pointer shrink-0"
      >
        <div
          className={clsx(
            'size-4 rounded border-2 flex items-center justify-center transition-all',
            method.isSelected
              ? 'bg-primary border-primary'
              : 'border-gray-300 hover:border-gray-400',
          )}
        >
          {method.isSelected && (
            <Icon name="check" style="solid" className="size-2.5 text-white" />
          )}
        </div>
      </button>
      <Icon name={method.icon} style="solid" className="size-4 shrink-0" />
      <div className="flex-1 flex flex-col min-w-0">
        <span className={clsx('text-sm', method.isSelected && 'font-medium')}>
          {method.label}
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Icon name="baht-sign" style="light" className="size-3" />
          <span className="truncate">{Number(method.appraisalValue).toLocaleString()}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSelectCalculationMethod({ approachType, methodType: method.methodType })}
        className="cursor-pointer shrink-0 p-1 rounded hover:bg-gray-100"
      >
        <Icon
          name="pen"
          style="solid"
          className="size-3.5 text-gray-500 hover:text-primary transition-colors"
        />
      </button>
    </div>
  );
};
