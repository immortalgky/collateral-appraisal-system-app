import { useFormContext, useWatch, useController } from 'react-hook-form';
import type { LeaseholdFormType } from '../schemas/leaseholdForm';
import { calculatePartialUsage } from '../domain/calculateLeasehold';
import { useEffect, useMemo, useState } from 'react';
import { NumberInput } from '@/shared/components/inputs';
import Toggle from '@/shared/components/inputs/Toggle';

interface LeaseholdPartialUsageSectionProps {
  finalValueRounded: number;
  landValuePerSqWa: number;
  onEstimateChange?: (estimateRounded: number, estimateNet: number | null) => void;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function LeaseholdPartialUsageSection({
  finalValueRounded,
  landValuePerSqWa,
  onEstimateChange,
}: LeaseholdPartialUsageSectionProps) {
  const { control, setValue } = useFormContext<LeaseholdFormType>();
  const isPartialUsage = useWatch({ control, name: 'isPartialUsage' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const partialRaiCtrl = useController({ control, name: 'partialRai' });
  const partialNganCtrl = useController({ control, name: 'partialNgan' });
  const partialWaCtrl = useController({ control, name: 'partialWa' });
  const pricePerSqWaCtrl = useController({ control, name: 'pricePerSqWa' });

  useEffect(() => {
    if (isPartialUsage && landValuePerSqWa > 0 && !pricePerSqWaCtrl.field.value) {
      setValue('pricePerSqWa', landValuePerSqWa, { shouldDirty: true });
    }
  }, [isPartialUsage, landValuePerSqWa]);

  const partial = useMemo(() => {
    if (!isPartialUsage) return null;
    return calculatePartialUsage({
      finalValue: finalValueRounded,
      rai: partialRaiCtrl.field.value ?? 0,
      ngan: partialNganCtrl.field.value ?? 0,
      wa: partialWaCtrl.field.value ?? 0,
      pricePerSqWa: pricePerSqWaCtrl.field.value ?? 0,
    });
  }, [
    isPartialUsage,
    finalValueRounded,
    partialRaiCtrl.field.value,
    partialNganCtrl.field.value,
    partialWaCtrl.field.value,
    pricePerSqWaCtrl.field.value,
  ]);

  const recalcEstimate = (overrides: Partial<{ rai: number | null; ngan: number | null; wa: number | null; pricePerSqWa: number | null }> = {}) => {
    const p = calculatePartialUsage({
      finalValue: finalValueRounded,
      rai: (overrides.rai !== undefined ? overrides.rai : partialRaiCtrl.field.value) ?? 0,
      ngan: (overrides.ngan !== undefined ? overrides.ngan : partialNganCtrl.field.value) ?? 0,
      wa: (overrides.wa !== undefined ? overrides.wa : partialWaCtrl.field.value) ?? 0,
      pricePerSqWa: (overrides.pricePerSqWa !== undefined ? overrides.pricePerSqWa : pricePerSqWaCtrl.field.value) ?? 0,
    });
    onEstimateChange?.(p.estimatePriceRounded, p.estimateNetPrice);
  };

  const rai = partialRaiCtrl.field.value ?? 0;
  const ngan = partialNganCtrl.field.value ?? 0;
  const wa = partialWaCtrl.field.value ?? 0;
  const hasArea = rai > 0 || ngan > 0 || wa > 0;

  const formatArea = () => `${rai}-${ngan}-${wa}`;

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between">
        <Toggle
          label="Partial Usage"
          options={['No', 'Yes']}
          size="sm"
          checked={isPartialUsage}
          onChange={(checked) => {
            setValue('isPartialUsage', checked, { shouldDirty: true });
            if (checked) {
              recalcEstimate({});
              setIsModalOpen(true);
            } else {
              onEstimateChange?.(finalValueRounded, null);
            }
          }}
        />
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-gray-400">Partial Land Area</div>
            {isPartialUsage ? (
              <div className="flex items-center gap-1 justify-end">
                <div className="text-xs font-medium text-gray-700">
                  {hasArea ? (
                    <>
                      <span className="text-gray-400">{formatArea()}</span>
                      {' '}
                      {fmt(partial?.partialLandArea ?? 0)}
                    </>
                  ) : '-'}
                  <span className="text-[10px] text-gray-400 ml-0.5">Sq.Wa</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-primary hover:text-primary/80 p-0.5 rounded hover:bg-primary/5 transition-colors"
                  title="Edit partial land area"
                >
                  <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-400">-</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-400">Price per Sq.Wa</div>
            <div className="text-xs font-medium text-gray-700">
              {isPartialUsage ? fmt(pricePerSqWaCtrl.field.value ?? landValuePerSqWa) : '-'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-400">Partial Land Price</div>
            <div className="text-sm font-bold text-gray-900">
              {isPartialUsage && partial ? fmt(partial.partialLandPrice) : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for editing Rai / Ngan / Sq.Wa */}
      {isModalOpen && (
        <PartialAreaModal
          rai={rai}
          ngan={ngan}
          wa={wa}
          onSave={(r, n, w) => {
            setValue('partialRai', r, { shouldDirty: true });
            setValue('partialNgan', n, { shouldDirty: true });
            setValue('partialWa', w, { shouldDirty: true });
            recalcEstimate({ rai: r, ngan: n, wa: w });
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

function PartialAreaModal({
  rai,
  ngan,
  wa,
  onSave,
  onClose,
}: {
  rai: number;
  ngan: number;
  wa: number;
  onSave: (rai: number, ngan: number, wa: number) => void;
  onClose: () => void;
}) {
  const [localRai, setLocalRai] = useState(rai);
  const [localNgan, setLocalNgan] = useState(ngan);
  const [localWa, setLocalWa] = useState(wa);

  const totalSqWa = (localRai || 0) * 400 + (localNgan || 0) * 100 + (localWa || 0);
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-5 w-80 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Partial Land Area</h3>
        <div className="space-y-3">
          <NumberInput
            label="Rai"
            name="modalRai"
            value={localRai}
            onChange={(e) => setLocalRai(e.target.value ?? 0)}
            decimalPlaces={0}
          />
          <NumberInput
            label="Ngan"
            name="modalNgan"
            value={localNgan}
            onChange={(e) => setLocalNgan(e.target.value ?? 0)}
            decimalPlaces={0}
          />
          <NumberInput
            label="Sq.Wa"
            name="modalWa"
            value={localWa}
            onChange={(e) => setLocalWa(e.target.value ?? 0)}
            decimalPlaces={2}
          />
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-sm font-semibold text-gray-900">{fmt(totalSqWa)} Sq.Wa</span>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(localRai, localNgan, localWa)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
