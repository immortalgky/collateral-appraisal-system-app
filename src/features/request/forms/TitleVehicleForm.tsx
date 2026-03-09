import { FormFields } from '@/shared/components/form';
import { titleVehicleFields } from '../configs/fields';

interface TitleVehicleFormProps {
  index: number;
}

const TitleVehicleForm = ({ index }: TitleVehicleFormProps) => {
  return <FormFields fields={titleVehicleFields} namePrefix={'titles'} index={index} />;
};

export default TitleVehicleForm;
