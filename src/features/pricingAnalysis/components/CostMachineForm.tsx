import { Textarea } from '@/shared/components';
import { CostMachineSection, type MachineryItem } from './CostMachineSection';
import { useController, useFormContext } from 'react-hook-form';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';

interface CostMachineProp {
  machineryItems: MachineryItem[];
  isLoading?: boolean;
  methodId?: string;
  marketSurveys?: MarketComparableDetailType[];
  templateList?: TemplateDtoType[] | undefined;
}
/**
 * Own component on purpose. The character counter needs the value on every keystroke, which means
 * useController rather than register — and a subscription in the parent would re-render the whole
 * machinery table (every row runs seven useWatch subscriptions) on each character typed. Keeping
 * it here confines the re-render to this one node.
 */
const RemarkField = () => {
  const { control } = useFormContext();
  const { field } = useController({ name: 'remark', control });

  return (
    /* 4000 is the column itself: appraisal.PricingAnalysisMethods.Remark is nvarchar(4000), so
       this cap is what keeps a long remark from being truncated on the way in. */
    <Textarea label="Remark" maxLength={4000} showCharCount {...field} value={field.value ?? ''} />
  );
};

const CostMachineForm = ({
  machineryItems,
  isLoading,
  methodId,
  marketSurveys,
  templateList,
}: CostMachineProp) => {
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-4">
      <div className="col-span-12">
        <CostMachineSection
          machineryItems={machineryItems}
          isLoading={isLoading}
          methodId={methodId}
          marketSurveys={marketSurveys}
          templateList={templateList}
        />
      </div>
      <div className="col-span-12">
        <RemarkField />
      </div>
    </div>
  );
};

export default CostMachineForm;
