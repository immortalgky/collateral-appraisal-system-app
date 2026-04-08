import { useState, useEffect } from 'react';
import { Button, Icon } from '@/shared/components';
import { NumberInput } from '@/shared/components/inputs';
import type { LandGrowthRateType, LandGrowthPeriod } from '../types/leasehold';

interface LeaseholdLandValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  landValuePerSqWa: number;
  landGrowthRateType: LandGrowthRateType;
  landGrowthRatePercent: number;
  landGrowthIntervalYears: number;
  landGrowthPeriods: Omit<LandGrowthPeriod, 'id'>[];
  onSave: (data: {
    landValuePerSqWa: number;
    landGrowthRateType: LandGrowthRateType;
    landGrowthRatePercent: number;
    landGrowthIntervalYears: number;
    landGrowthPeriods: Omit<LandGrowthPeriod, 'id'>[];
  }) => void;
}

export function LeaseholdLandValueModal({
  isOpen,
  onClose,
  landValuePerSqWa,
  landGrowthRateType,
  landGrowthRatePercent,
  landGrowthIntervalYears,
  landGrowthPeriods,
  onSave,
}: LeaseholdLandValueModalProps) {
  const [value, setValue] = useState(landValuePerSqWa);
  const [growthType, setGrowthType] = useState<LandGrowthRateType>(landGrowthRateType);
  const [ratePercent, setRatePercent] = useState(landGrowthRatePercent);
  const [intervalYears, setIntervalYears] = useState(landGrowthIntervalYears);
  const [periods, setPeriods] = useState<Omit<LandGrowthPeriod, 'id'>[]>(landGrowthPeriods);

  useEffect(() => {
    if (isOpen) {
      setValue(landValuePerSqWa);
      setGrowthType(landGrowthRateType);
      setRatePercent(landGrowthRatePercent);
      setIntervalYears(landGrowthIntervalYears);
      setPeriods([...landGrowthPeriods]);
    }
  }, [isOpen, landValuePerSqWa, landGrowthRateType, landGrowthRatePercent, landGrowthIntervalYears, landGrowthPeriods]);

  if (!isOpen) return null;

  const handleAddPeriod = () => {
    const lastTo = periods.length > 0 ? periods[periods.length - 1].toYear : 0;
    setPeriods([...periods, { fromYear: lastTo + 1, toYear: lastTo + 5, growthRatePercent: 0 }]);
  };

  const handleRemovePeriod = (idx: number) => {
    setPeriods(periods.filter((_, i) => i !== idx));
  };

  const handlePeriodChange = (idx: number, field: keyof Omit<LandGrowthPeriod, 'id'>, val: number | null) => {
    const updated = [...periods];
    updated[idx] = { ...updated[idx], [field]: val ?? 0 };
    setPeriods(updated);
  };

  const handleClear = () => {
    setValue(0);
    setRatePercent(0);
    setIntervalYears(1);
    setPeriods([]);
  };

  const handleSave = () => {
    onSave({
      landValuePerSqWa: value,
      landGrowthRateType: growthType,
      landGrowthRatePercent: ratePercent,
      landGrowthIntervalYears: intervalYears,
      landGrowthPeriods: periods,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Land Value</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="xmark" className="size-5" />
          </button>
        </div>

        {/* Land Value */}
        <NumberInput
          label="Land Value *"
          value={value}
          onChange={(e) => setValue(e.target.value ?? 0)}
          decimalPlaces={2}
          rightIcon={<span className="text-xs text-gray-400">Baht/Sq.Wa</span>}
          className="!pr-[5.5rem]"
        />

        {/* Growth Type Toggle */}
        <div>
          <label className="text-sm text-gray-600">Land Value Growth Rate</label>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setGrowthType('Frequency')}
              className={`px-3 py-1.5 text-xs rounded-full border ${
                growthType === 'Frequency'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Frequency
            </button>
            <button
              type="button"
              onClick={() => setGrowthType('Period')}
              className={`px-3 py-1.5 text-xs rounded-full border ${
                growthType === 'Period'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Period
            </button>
          </div>
        </div>

        {/* Frequency Mode */}
        {growthType === 'Frequency' && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <NumberInput
                label="Rate (%)"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value ?? 0)}
                decimalPlaces={2}
                rightIcon={<span className="text-xs text-gray-400">%</span>}
              />
            </div>
            <span className="text-sm text-gray-500 pb-2">Every</span>
            <div className="flex-1">
              <NumberInput
                label="Year(s)"
                value={intervalYears}
                onChange={(e) => setIntervalYears(e.target.value ?? 1)}
                decimalPlaces={0}
                rightIcon={<span className="text-xs text-gray-400">Year</span>}
              />
            </div>
          </div>
        )}

        {/* Period Mode */}
        {growthType === 'Period' && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 text-xs text-gray-500 font-medium">
              <span>From Year</span>
              <span>To Year</span>
              <span>Growth Rate (%)</span>
              <span />
            </div>
            {periods.map((p, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-end">
                <NumberInput
                  value={p.fromYear}
                  onChange={(e) => handlePeriodChange(idx, 'fromYear', e.target.value)}
                  decimalPlaces={0}
                />
                <NumberInput
                  value={p.toYear}
                  onChange={(e) => handlePeriodChange(idx, 'toYear', e.target.value)}
                  decimalPlaces={0}
                />
                <NumberInput
                  value={p.growthRatePercent}
                  onChange={(e) => handlePeriodChange(idx, 'growthRatePercent', e.target.value)}
                  decimalPlaces={2}
                  rightIcon={<span className="text-xs text-gray-400">%</span>}
                />
                <button
                  type="button"
                  onClick={() => handleRemovePeriod(idx)}
                  className="flex items-center justify-center text-red-400 hover:text-red-600 pb-1"
                >
                  <Icon name="xmark" className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddPeriod}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Icon name="plus" className="size-3" />
              Add Periods
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost" type="button" onClick={handleClear} className="text-red-500">
              Clear
            </Button>
          </div>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
