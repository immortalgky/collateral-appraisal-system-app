import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import { NumberInput } from '@/shared/components/inputs';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import type { Method } from '../../types/selection';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/shared/hooks/useDebounce';

const MANUAL_VALUE_DEBOUNCE_MS = 1000;

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
  onToggleMethodCalcMode?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  isManualMode?: boolean;
  onManualValueSync?: (arg: {
    approachType: string;
    methodType: string;
    value: number;
    methodId?: string;
  }) => void;
  disabled?: boolean;
}

type MethodStatusKey = 'calculated' | 'pending' | 'notIncluded';

function getMethodStatusKey(method: Method): MethodStatusKey {
  if (method.appraisalValue > 0) return 'calculated';
  if (method.isIncluded) return 'pending';
  return 'notIncluded';
}

export const PricingAnalysisMethodCard = ({
  viewMode,
  viewLayout = 'grid',
  approachType,
  method,
  onSelectCalculationMethod,
  onSelectCandidateMethod,
  onToggleMethodCalcMode,
  onDeleteMethod,
  isManualMode,
  onManualValueSync,
  disabled = false,
}: PricingAnalysisMethodCardProps) => {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  const [manualInput, setManualInput] = useState<number | null>(method.appraisalValue ?? null);
  const debouncedManualInput = useDebounce(manualInput, MANUAL_VALUE_DEBOUNCE_MS);
  const appraisalValueRef = useRef(method.appraisalValue);
  appraisalValueRef.current = method.appraisalValue;

  // Local-only sync: 1s after the user stops typing, push the value into the reducer
  // so anything reading state.summarySelected mid-edit (approach totals, the
  // SUMMARY_SELECT_METHOD "must have value" guard) sees it without waiting for blur.
  // Fires only when the *typed* value settles — not when method.appraisalValue changes —
  // so an external reset (analysis-wide calc-mode change) can't make this re-push a stale value.
  useEffect(() => {
    if (!isManualMode || !onManualValueSync) return;
    if (debouncedManualInput == null || debouncedManualInput < 0) return;
    if (debouncedManualInput === appraisalValueRef.current) return;

    onManualValueSync({
      approachType,
      methodType: method.methodType,
      value: debouncedManualInput,
      methodId: method.id,
    });
  }, [
    debouncedManualInput,
    isManualMode,
    onManualValueSync,
    approachType,
    method.methodType,
    method.id,
  ]);

  // Adopt external changes to the committed value back into the local input. Handles the
  // analysis-wide calc-mode reset (every method's appraisalValue → 0) and any other external
  // update, so the NumberInput never keeps showing / re-pushing a stale value until refresh.
  useEffect(() => {
    const external = method.appraisalValue ?? null;
    setManualInput(prev => (prev === external ? prev : external && external > 0 ? external : null));
  }, [method.appraisalValue]);

  const handleManualChange = (e: { target: { name?: string; value: number | null } }) => {
    setManualInput(e.target.value);
  };

  // Immediate flush on blur — no server call, just guarantees the reducer has the
  // latest typed value even if the user clicks Save before the 1s debounce above
  // settles (clicking Save already blurs this input, so this costs the user nothing
  // extra — it's not the "must click away first" friction the debounce was meant to
  // replace, since it never requires an action the user wasn't already taking).
  const handleManualBlur = () => {
    if (!isManualMode || !onManualValueSync) return;
    if (manualInput == null || manualInput < 0) return;
    if (manualInput === method.appraisalValue) return;

    onManualValueSync({
      approachType,
      methodType: method.methodType,
      value: manualInput,
      methodId: method.id,
    });
  };

  const handleManualKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setManualInput(method.appraisalValue ?? null);
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
        {!isReadOnly && onDeleteMethod && method.id && (
          <button
            type="button"
            className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
            onClick={e => {
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

  const statusKey = getMethodStatusKey(method);
  const statusLabel = t(`methodStatus.${statusKey}` as `methodStatus.${MethodStatusKey}`);

  // Grid tile view — card with hero value
  if (viewLayout === 'grid') {
    const Wrapper = isManualMode ? 'div' : 'button';
    const wrapperProps = isManualMode
      ? {}
      : {
          type: 'button' as const,
          disabled,
          onClick: () => onSelectCalculationMethod({ approachType, methodType: method.methodType }),
        };

    return (
      <Wrapper
        {...wrapperProps}
        className={clsx(
          'flex flex-col gap-2 p-4 rounded-xl border transition-all duration-200 text-left w-full',
          isManualMode ? '' : disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
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
            className={clsx(
              'size-4 shrink-0',
              method.isSelected ? 'text-primary' : 'text-gray-400',
            )}
          />
          <span
            className={clsx(
              'flex-1 text-sm font-medium',
              method.isSelected ? 'text-primary' : 'text-gray-700',
            )}
          >
            {method.label}
          </span>
          {!isReadOnly && onToggleMethodCalcMode && (
            <button
              type="button"
              disabled={disabled}
              aria-pressed={isManualMode}
              title={t('calculationMode.manual')}
              onClick={e => {
                e.stopPropagation();
                onToggleMethodCalcMode({ approachType, methodType: method.methodType });
              }}
              className={clsx(
                'shrink-0 inline-flex items-center h-6 px-1.5 text-[9px] rounded-full border-2 font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-1',
                isManualMode
                  ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-orange-600/50 hover:bg-orange-600/50 hover:text-white',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              )}
            >
              <span>m</span>
            </button>
          )}
          {isReadOnly ? (
            <div
              className={clsx(
                'size-4 rounded border-2 flex items-center justify-center shrink-0',
                method.isSelected ? 'bg-primary border-primary' : 'border-gray-300',
              )}
            >
              {method.isSelected && (
                <Icon name="check" style="solid" className="size-2.5 text-white" />
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={e => {
                e.stopPropagation();
                onSelectCandidateMethod({ approachType, methodType: method.methodType });
              }}
              className={clsx(
                'shrink-0',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              )}
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
          )}
        </div>

        {/* Hero value or manual input */}
        {isManualMode ? (
          isReadOnly ? (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-gray-800">
                {Number(method.appraisalValue).toLocaleString()}
              </span>
              <Icon name="baht-sign" style="light" className="size-3.5 text-gray-400" />
            </div>
          ) : (
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
          )
        ) : (
          <div className="flex items-baseline gap-1">
            <span
              className={clsx(
                'text-xl font-semibold',
                method.isSelected ? 'text-primary' : 'text-gray-800',
              )}
            >
              {Number(method.appraisalValue).toLocaleString()}
            </span>
            <Icon
              name="baht-sign"
              style="light"
              className={clsx('size-3.5', method.isSelected ? 'text-primary/70' : 'text-gray-400')}
            />
          </div>
        )}

        {/* Status badge */}
        <Badge
          size="xs"
          dot
          badgeStyle="soft"
          type="status"
          value={
            statusKey === 'calculated'
              ? 'completed'
              : statusKey === 'pending'
                ? 'draft'
                : 'cancelled'
          }
        >
          {statusLabel}
        </Badge>
      </Wrapper>
    );
  }

  // List view — compact row
  const ListWrapper = isManualMode ? 'div' : 'button';
  const listWrapperProps = isManualMode
    ? {}
    : {
        type: 'button' as const,
        disabled,
        onClick: () => onSelectCalculationMethod({ approachType, methodType: method.methodType }),
      };

  return (
    <ListWrapper
      {...listWrapperProps}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full',
        isManualMode ? '' : disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        method.isSelected ? 'bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-gray-50',
      )}
    >
      {/* Candidate checkbox */}
      {isReadOnly ? (
        <div
          className={clsx(
            'size-4 rounded border-2 flex items-center justify-center shrink-0',
            method.isSelected ? 'bg-primary border-primary' : 'border-gray-300',
          )}
        >
          {method.isSelected && <Icon name="check" style="solid" className="size-2.5 text-white" />}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={e => {
            e.stopPropagation();
            onSelectCandidateMethod({ approachType, methodType: method.methodType });
          }}
          className={clsx(
            'shrink-0',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          )}
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
      )}
      <Icon
        name={method.icon}
        style="solid"
        className={clsx('size-4 shrink-0', method.isSelected ? 'text-primary' : 'text-gray-400')}
      />
      <span
        className={clsx(
          'flex-1 text-sm text-left',
          method.isSelected ? 'font-medium text-primary' : 'text-gray-700',
        )}
      >
        {method.label}
      </span>
      {!isReadOnly && onToggleMethodCalcMode && (
        <button
          type="button"
          disabled={disabled}
          title={t('calculationMode.manual')}
          onClick={e => {
            e.stopPropagation();
            onToggleMethodCalcMode({ approachType, methodType: method.methodType });
          }}
          className={clsx(
            'shrink-0 flex items-center gap-1',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          )}
        >
          <div
            className={clsx(
              'size-4 rounded border-2 flex items-center justify-center transition-all',
              isManualMode
                ? 'bg-amber-500 border-amber-500'
                : 'border-gray-300 hover:border-gray-400',
            )}
          >
            {isManualMode && (
              <Icon name="pen-field" style="solid" className="size-2.5 text-white" />
            )}
          </div>
          <span className={clsx('text-xs', isManualMode ? 'text-amber-600' : 'text-gray-400')}>
            {t('calculationMode.manualToggle')}
          </span>
        </button>
      )}
      {isManualMode ? (
        isReadOnly ? (
          <div className="flex items-center gap-1 text-sm font-semibold text-gray-600">
            <span>{Number(method.appraisalValue).toLocaleString()}</span>
            <Icon name="baht-sign" style="light" className="size-3" />
          </div>
        ) : (
          <NumberInput
            value={manualInput}
            disabled={disabled}
            onChange={handleManualChange}
            onBlur={handleManualBlur}
            onKeyDown={handleManualKeyDown}
            decimalPlaces={2}
            placeholder="0.00"
            fullWidth={false}
            className="w-40"
            rightIcon={<Icon name="baht-sign" style="light" className="size-3" />}
          />
        )
      ) : (
        <div
          className={clsx(
            'flex items-center gap-1 text-sm font-semibold',
            method.isSelected ? 'text-primary' : 'text-gray-600',
          )}
        >
          <span>{Number(method.appraisalValue).toLocaleString()}</span>
          <Icon name="baht-sign" style="light" className="size-3" />
        </div>
      )}
      <Badge
        size="xs"
        dot
        badgeStyle="soft"
        type="status"
        value={
          statusKey === 'calculated' ? 'completed' : statusKey === 'pending' ? 'draft' : 'cancelled'
        }
        className="shrink-0"
      >
        {statusLabel}
      </Badge>
      {!isManualMode && (
        <Icon name="chevron-right" style="solid" className="size-3 text-gray-300 shrink-0" />
      )}
    </ListWrapper>
  );
};
