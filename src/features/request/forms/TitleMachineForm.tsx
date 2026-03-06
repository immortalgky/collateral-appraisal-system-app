import { FormFields } from '@/shared/components/form';
import { titleMachineFields } from '../configs/fields';

interface TitleMachineFormProps {
  index: number;
}

const TitleMachineForm = ({ index }: TitleMachineFormProps) => {
  return <FormFields fields={titleMachineFields} namePrefix={'titles'} index={index} />;
};

export default TitleMachineForm;
