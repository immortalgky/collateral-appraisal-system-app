import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { syncWQSFormSurveys } from '@/features/pricingAnalysis/adapters/syncWQSFormSurveys';
import type { MarketComparableDetailType } from '@features/pricingAnalysis/schemas';
import type { WQSFormType } from '@/features/pricingAnalysis/schemas/wqsForm';

/**
 * Picking comparables rebuilds the WQS form with reset(). Edits made before that must still count
 * as unsaved, as they do in the SAG and DC sync, or leaving the page no longer warns about them.
 */

const defaults = {
  comparativeSurveys: [],
  WQSScores: [],
  WQSTotalScores: { surveys: [] },
  WQSCalculations: [],
  WQSFinalValue: { finalValueRounded: 0 },
} as unknown as WQSFormType;

function useWQSForm() {
  const form = useForm<WQSFormType>({ defaultValues: defaults });
  // Read in render: react-hook-form only tracks formState fields a render has subscribed to.
  void form.formState.isDirty;
  return form;
}

describe('syncWQSFormSurveys', () => {
  it('keeps unsaved edits flagged after the comparable selection changes', () => {
    const { result } = renderHook(useWQSForm);

    act(() => {
      result.current.setValue('WQSFinalValue.finalValueRounded', 5, { shouldDirty: true });
    });
    expect(result.current.formState.isDirty).toBe(true);

    act(() => {
      syncWQSFormSurveys({
        collateralType: 'L',
        methodId: 'method-1',
        methodType: 'WQS',
        comparativeSurveys: [{ id: 'm1' }] as MarketComparableDetailType[],
        reset: result.current.reset,
        getValues: result.current.getValues,
      });
    });

    expect(result.current.getValues('comparativeSurveys')).toEqual([
      { marketId: 'm1', displaySeq: 1 },
    ]);
    expect(result.current.formState.isDirty).toBe(true);
  });
});
