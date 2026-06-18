import { useEffect, useMemo, useRef } from 'react';
import Modal from '@shared/components/Modal';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import {
  useValidateGroupForPricing,
  type PricingValidationStatus,
  type PricingValidationStep,
} from '../api/validation';
import {
  usePropertyGroupMandatoryValidation,
  type GroupPropertyRef,
} from '@features/appraisal/hooks/usePropertyGroupMandatoryValidation';

/**
 * Ordered list of the checks shown as a "checking…" skeleton while requests are in flight.
 * Rules 1–3 are validated on the backend; "Mandatory fields" runs on the front-end.
 */
const EXPECTED_STEPS: { key: string; displayName: string }[] = [
  { key: 'MarketSurvey', displayName: 'Market survey' },
  { key: 'BuildingDetail', displayName: 'Building detail' },
  { key: 'RentalSchedule', displayName: 'Rental schedule' },
  { key: 'MandatoryFields', displayName: 'Mandatory fields' },
];

interface PricingValidationModalProps {
  isOpen: boolean;
  /** The property group being validated. Undefined keeps the request idle. */
  groupId: string | undefined;
  /** Appraisal context, required for the front-end mandatory-field checks. */
  appraisalId: string | undefined;
  /** Properties in the group (for the front-end mandatory-field checks). */
  properties: GroupPropertyRef[];
  onClose: () => void;
  /** Called once when every rule passes — caller navigates to Pricing Analysis. */
  onAllPassed: () => void;
}

const STATUS_META: Record<
  PricingValidationStatus,
  { icon: string; iconClass: string; rowClass: string; label: string }
> = {
  Passed: {
    icon: 'circle-check',
    iconClass: 'text-emerald-500',
    rowClass: 'bg-emerald-50/60 border-emerald-100',
    label: 'Passed',
  },
  Failed: {
    icon: 'circle-xmark',
    iconClass: 'text-red-500',
    rowClass: 'bg-red-50/60 border-red-100',
    label: 'Failed',
  },
  Skipped: {
    icon: 'circle-minus',
    iconClass: 'text-gray-300',
    rowClass: 'bg-gray-50 border-gray-100',
    label: 'Not applicable',
  },
};

function StepRow({ step }: { step: PricingValidationStep }) {
  const meta = STATUS_META[step.status];
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${meta.rowClass}`}>
      <div className="flex items-center gap-2.5">
        <Icon name={meta.icon} style="solid" className={`text-base ${meta.iconClass}`} />
        <span className="text-sm font-medium text-gray-800 flex-1">{step.displayName}</span>
        <span className="text-xs font-medium text-gray-500">{meta.label}</span>
      </div>
      {step.messages.length > 0 && (
        <ul className="mt-1.5 ml-7 space-y-0.5">
          {step.messages.map((m, i) => (
            <li key={i} className="text-xs text-red-600">
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckingRow({ displayName }: { displayName: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <Icon name="spinner" style="solid" className="text-base text-primary animate-spin" />
        <span className="text-sm font-medium text-gray-600 flex-1">{displayName}</span>
        <span className="text-xs text-gray-400">Checking…</span>
      </div>
    </div>
  );
}

/**
 * Blocking modal that runs the pricing-analysis pre-flight checks for a group.
 * Backend rules (group has properties, maker survey, building detail, rental schedule) are
 * combined with the front-end "mandatory fields" rule. On all-pass it invokes onAllPassed
 * (navigate); on failure it lists the failing rules with per-property detail.
 */
export function PricingValidationModal({
  isOpen,
  groupId,
  appraisalId,
  properties,
  onClose,
  onAllPassed,
}: PricingValidationModalProps) {
  const backend = useValidateGroupForPricing(groupId, isOpen);
  const mandatory = usePropertyGroupMandatoryValidation(appraisalId, properties, isOpen);

  const isFetching = backend.isFetching || mandatory.isLoading;
  const isError = backend.isError;

  // Combine backend steps with the front-end mandatory-fields step for display.
  const steps = useMemo<PricingValidationStep[]>(() => {
    if (isFetching || isError || !backend.data) return [];
    const mandatoryStep: PricingValidationStep = {
      key: 'MandatoryFields',
      displayName: 'Mandatory fields',
      status: mandatory.status,
      messages: mandatory.messages,
    };
    return [...backend.data.steps, mandatoryStep];
  }, [isFetching, isError, backend.data, mandatory.status, mandatory.messages]);

  const isValid =
    !isFetching && !isError && backend.data?.valid === true && mandatory.status !== 'Failed';

  const failed = !isFetching && !isError && !!backend.data && !isValid;

  // Fire onAllPassed exactly once per successful open.
  const passedFiredRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      passedFiredRef.current = false;
      return;
    }
    if (isValid && !passedFiredRef.current) {
      passedFiredRef.current = true;
      onAllPassed();
    }
  }, [isOpen, isValid, onAllPassed]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Validating property group" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {isFetching
            ? 'Checking the group has enough data for pricing analysis…'
            : failed
              ? 'Some checks did not pass. Resolve the items below, then try again.'
              : 'All checks passed.'}
        </p>

        <div className="space-y-2">
          {isFetching &&
            EXPECTED_STEPS.map(s => <CheckingRow key={s.key} displayName={s.displayName} />)}

          {!isFetching && steps.map(s => <StepRow key={s.key} step={s} />)}
        </div>

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">
              Validation could not be completed. Please try again.
            </p>
          </div>
        )}

        {(failed || isError) && (
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => backend.refetch()} disabled={isFetching}>
              <Icon name="rotate-right" style="solid" className="mr-1.5 size-3.5" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default PricingValidationModal;
