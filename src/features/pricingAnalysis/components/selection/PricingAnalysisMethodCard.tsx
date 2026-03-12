import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import { NumberInput } from '@/shared/components/inputs';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import type { Method } from '../../types/selection';

export type ViewLayout = 'grid' | 'list';

interface PricingAnalysisMethodCardProps {
  viewMode: 'editing' | 'summary';
  viewLayout?: ViewLayout;
  approachId?: string;
  approachType: string;
  method: Method;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  isManualMode?: boolean;
  onManualValueChange?: (arg: { approachType: string; methodType: string; value: number }) => void;
}

function getMethodStatus(method: Method): { label: string; color: 'emerald' | 'amber' | 'gray' } {
  if (method.appraisalValue > 0) return { label: 'Calculated', color: 'emerald' };
  if (method.isIncluded) return { label: 'Pending', color: 'amber' };
  return { label: 'Not included', color: 'gray' };
}

export const PricingAnalysisMethodCard = ({
  viewMode,
  viewLayout = 'grid',
  approachType,
  method,
  onSelectCalculationMethod,
  onSelectCandidateMethod,
  onDeleteMethod,
  isManualMode,
  onManualValueChange,
}: PricingAnalysisMethodCardProps) => {
  const [manualInput, setManualInput] = useState<number | null>(method.appraisalValue || null);
  const isEscapingRef = useRef(false);

  const handleManualChange = (e: { target: { name?: string; value: number | null } }) => {
    setManualInput(e.target.value);
  };

  const handleManualBlur = () => {
    if (isEscapingRef.current) {
      isEscapingRef.current = false;
      return;
    }
    const num = manualInput ?? 0;
    if (num >= 0 && onManualValueChange) {
      onManualValueChange({ approachType, methodType: method.methodType, value: num });
    }
  };

  const handleManualKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      isEscapingRef.current = true;
      setManualInput(method.appraisalValue || null);
      (e.target as HTMLInputElement).blur();
    }
  };
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

  const status = getMethodStatus(method);

  // Grid tile view — card with hero value
  if (viewLayout === 'grid') {
    const Wrapper = isManualMode ? 'div' : 'button';
    const wrapperProps = isManualMode
      ? {}
      : { type: 'button' as const, onClick: () => onSelectCalculationMethod({ approachType, methodType: method.methodType }) };

    return (
      <Wrapper
        {...wrapperProps}
        className={clsx(
          'flex flex-col gap-2 p-4 rounded-xl border transition-all duration-200 text-left w-full',
          isManualMode ? '' : 'cursor-pointer',
          method.isSelected
            ? 'ring-2 ring-primary bg-primary/5 border-primary'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white',
        )}
      >
        {/* Header: icon + label + candidate checkbox */}
        <div className="flex items-center gap-2 w-full">
          <Icon
            name={method.icon}
            style="solid"
            className={clsx('size-4 shrink-0', method.isSelected ? 'text-primary' : 'text-gray-400')}
          />
          <span className={clsx('flex-1 text-sm font-medium', method.isSelected ? 'text-primary' : 'text-gray-700')}>
            {method.label}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCandidateMethod({ approachType, methodType: method.methodType });
            }}
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
        </div>

        {/* Hero value or manual input */}
        {isManualMode ? (
          <NumberInput
            value={manualInput}
            onChange={handleManualChange}
            onBlur={handleManualBlur}
            onKeyDown={handleManualKeyDown}
            decimalPlaces={2}
            placeholder="0.00"
            rightIcon={<Icon name="baht-sign" style="light" className="size-3.5" />}
            className="text-xl font-semibold"
          />
        ) : (
          <div className="flex items-baseline gap-1">
            <span className={clsx('text-xl font-semibold', method.isSelected ? 'text-primary' : 'text-gray-800')}>
              {Number(method.appraisalValue).toLocaleString()}
            </span>
            <Icon name="baht-sign" style="light" className={clsx('size-3.5', method.isSelected ? 'text-primary/70' : 'text-gray-400')} />
          </div>
        )}

        {/* Status badge */}
        <Badge
          size="xs"
          dot
          badgeStyle="soft"
          type="status"
          value={status.label === 'Calculated' ? 'completed' : status.label === 'Pending' ? 'draft' : 'cancelled'}
        >
          {status.label}
        </Badge>
      </Wrapper>
    );
  }

  // List view — compact row
  const ListWrapper = isManualMode ? 'div' : 'button';
  const listWrapperProps = isManualMode
    ? {}
    : { type: 'button' as const, onClick: () => onSelectCalculationMethod({ approachType, methodType: method.methodType }) };

  return (
    <ListWrapper
      {...listWrapperProps}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full',
        isManualMode ? '' : 'cursor-pointer',
        method.isSelected
          ? 'bg-primary/5 ring-1 ring-primary/30'
          : 'hover:bg-gray-50',
      )}
    >
      {/* Candidate checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectCandidateMethod({ approachType, methodType: method.methodType });
        }}
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
      <Icon name={method.icon} style="solid" className={clsx('size-4 shrink-0', method.isSelected ? 'text-primary' : 'text-gray-400')} />
      <span className={clsx('flex-1 text-sm text-left', method.isSelected ? 'font-medium text-primary' : 'text-gray-700')}>
        {method.label}
      </span>
      {isManualMode ? (
        <NumberInput
          value={manualInput}
          onChange={handleManualChange}
          onBlur={handleManualBlur}
          onKeyDown={handleManualKeyDown}
          decimalPlaces={2}
          placeholder="0.00"
          fullWidth={false}
          className="w-40"
          rightIcon={<Icon name="baht-sign" style="light" className="size-3" />}
        />
      ) : (
        <div className={clsx('flex items-center gap-1 text-sm font-semibold', method.isSelected ? 'text-primary' : 'text-gray-600')}>
          <span>{Number(method.appraisalValue).toLocaleString()}</span>
          <Icon name="baht-sign" style="light" className="size-3" />
        </div>
      )}
      <Badge
        size="xs"
        dot
        badgeStyle="soft"
        type="status"
        value={status.label === 'Calculated' ? 'completed' : status.label === 'Pending' ? 'draft' : 'cancelled'}
        className="shrink-0"
      >
        {status.label}
      </Badge>
      {!isManualMode && (
        <Icon name="chevron-right" style="solid" className="size-3 text-gray-300 shrink-0" />
      )}
    </ListWrapper>
  );
};
