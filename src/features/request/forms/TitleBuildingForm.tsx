import { FormFields } from '@/shared/components/form';
import { titleBuildingFields, titleBuildingFieldsAlt } from '../configs/fields';

interface TitleBuildingFormProps {
  index: number;
  variant?: 2 | 3;
}

const TitleBuildingForm = ({ index, variant = 3 }: TitleBuildingFormProps) => {
  const fields = variant == 3 ? titleBuildingFields : titleBuildingFieldsAlt;
  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleBuildingForm;
