import { FormFields } from '@/shared/components/form';
import { titleCondoFields } from '../configs/fields';

interface TitleCondoFormProps {
  index: number;
}

const TitleCondoForm = ({ index }: TitleCondoFormProps) => {
  return <FormFields fields={titleCondoFields} namePrefix={'titles'} index={index} />;
};

export default TitleCondoForm;
