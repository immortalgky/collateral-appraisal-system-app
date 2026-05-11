import { useController, useFormContext, useWatch } from 'react-hook-form';
import type { EvaluationFormValues } from '../schemas/evaluation';
import { CRITERIA_WEIGHTS } from '../schemas/evaluation';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useDetectDeliveryTime } from '../api';

export type CriteriaIndex = 0 | 1 | 2 | 3 | 4;

interface EvaluationCriteriaRowProps {
  index: CriteriaIndex;
  criteriaLabel: string;
  appraisalId: string;
  disabled?: boolean;
}

const RATING_KEYS: readonly [
  'criteria1Rating',
  'criteria2Rating',
  'criteria3Rating',
  'criteria4Rating',
  'criteria5Rating',
] = [
  'criteria1Rating',
  'criteria2Rating',
  'criteria3Rating',
  'criteria4Rating',
  'criteria5Rating',
];

const DESC_KEYS: readonly [
  'criteria1Description',
  'criteria2Description',
  'criteria3Description',
  'criteria4Description',
  'criteria5Description',
] = [
  'criteria1Description',
  'criteria2Description',
  'criteria3Description',
  'criteria4Description',
  'criteria5Description',
];

function EvaluationCriteriaRow({ index, criteriaLabel, appraisalId, disabled = false }: EvaluationCriteriaRowProps) {
  const { control, setValue } = useFormContext<EvaluationFormValues>();
  const weight = CRITERIA_WEIGHTS[index];

  const ratingName = RATING_KEYS[index];
  const descName = DESC_KEYS[index];

  const { field: ratingField } = useController({ name: ratingName, control });
  const { field: descField } = useController({ name: descName, control });

  const rating = (ratingField.value as number) ?? 1;
  const score = weight * rating;

  const isDeliveryRow = index === 1;
  const { mutate: detectDelivery, isPending: isDetecting } = useDetectDeliveryTime();

  const detectedDays = useWatch({ control, name: 'criteria2DetectedDays' });
  const isAutoDetected = useWatch({ control, name: 'criteria2IsAutoDetected' });

  const handleAutoDetect = () => {
    detectDelivery(appraisalId, {
      onSuccess: response => {
        if (response.suggestedRating != null) {
          ratingField.onChange(response.suggestedRating);
        }
        if (response.detectedDays != null) {
          setValue('criteria2IsAutoDetected', true);
          setValue('criteria2DetectedDays', response.detectedDays);
        }
      },
    });
  };

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="px-3 py-2.5 text-sm text-gray-500 text-center w-8">{index + 1}</td>
      <td className="px-3 py-2.5 text-sm text-gray-700">{criteriaLabel}</td>
      <td className="px-3 py-2.5 text-sm text-gray-600 text-center tabular-nums w-16">
        {weight.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 w-44">
        <div className="flex items-center gap-2">
          <select
            value={rating}
            onChange={e => {
              ratingField.onChange(Number(e.target.value));
              if (isDeliveryRow) {
                setValue('criteria2IsAutoDetected', false);
              }
            }}
            onBlur={ratingField.onBlur}
            disabled={disabled}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white w-20 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>

          {isDeliveryRow && (
            <div className="flex items-center gap-1.5">
              <Button
                size="xs"
                variant="outline"
                onClick={handleAutoDetect}
                isLoading={isDetecting}
                disabled={disabled || isDetecting}
              >
                <Icon name="bolt" style="solid" className="size-3 mr-1" />
                Auto
              </Button>
              {isAutoDetected && detectedDays != null && (
                <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  {(detectedDays as number).toFixed(2)} days
                </span>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-700 text-center tabular-nums w-16">
        {score.toFixed(2)}
      </td>
      <td className="px-3 py-2.5">
        <input
          type="text"
          value={(descField.value as string | null | undefined) ?? ''}
          onChange={e => descField.onChange(e.target.value || null)}
          onBlur={descField.onBlur}
          disabled={disabled}
          placeholder="Optional note..."
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
        />
      </td>
    </tr>
  );
}

export default EvaluationCriteriaRow;
