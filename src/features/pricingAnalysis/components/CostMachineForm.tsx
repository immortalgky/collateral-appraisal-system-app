import { Textarea, TextInput } from '@/shared/components';
import { CostMachineSection, type MachineryItem } from './CostMachineSection';
import { useFormContext } from 'react-hook-form';

interface CostMachineProp {
  machineryItems: MachineryItem[];
}
const CostMachineForm = ({ machineryItems }: CostMachineProp) => {
  const { register } = useFormContext();

  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-4">
      <div className="col-span-6">
        <TextInput label="Group Description" maxLength={200} {...register('groupDescription')} />
      </div>
      <div className="col-span-12">
        <CostMachineSection machineryItems={machineryItems} />
      </div>
      <div className="col-span-12">
        <Textarea label="Remark" maxLength={4000} {...register('remark')} />
      </div>
    </div>
  );
};

export default CostMachineForm;
