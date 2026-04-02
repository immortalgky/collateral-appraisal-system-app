import { Textarea } from '@/shared/components';
import { CostMachineSection, type MachineryItem } from './CostMachineSection';
import { useFormContext } from 'react-hook-form';

interface CostMachineProp {
  machineryItems: MachineryItem[];
  isLoading?: boolean;
}
const CostMachineForm = ({ machineryItems, isLoading }: CostMachineProp) => {
  const { register } = useFormContext();

  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-4">
      <div className="col-span-12">
        <CostMachineSection machineryItems={machineryItems} isLoading={isLoading} />
      </div>
      <div className="col-span-12">
        <Textarea label="Remark" maxLength={4000} {...register('remark')} />
      </div>
    </div>
  );
};

export default CostMachineForm;
