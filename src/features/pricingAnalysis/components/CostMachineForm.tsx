import { Textarea } from '@/shared/components';
import { useController, useFormContext } from 'react-hook-form';

/**
 * Own component on purpose. The character counter needs the value on every keystroke, which means
 * useController rather than register — and a subscription in the parent would re-render the whole
 * machinery table (every row runs seven useWatch subscriptions) on each character typed. Keeping
 * it here confines the re-render to this one node.
 */
export const RemarkField = () => {
  const { control } = useFormContext();
  const { field } = useController({ name: 'remark', control });

  return (
    /* 4000 is the column itself: appraisal.PricingAnalysisMethods.Remark is nvarchar(4000), so
       this cap is what keeps a long remark from being truncated on the way in. */
    <Textarea label="Remark" maxLength={4000} showCharCount {...field} value={field.value ?? ''} />
  );
};
