import { FormFields } from '@/shared/components/form';
import { titleLandFields } from '../configs/fields';

interface TitleLandFormProps {
  index: number;
  variant?: 'land' | 'landAndBuilding';
}

const TitleLandForm = ({ index }: TitleLandFormProps) => {
  return <FormFields fields={titleLandFields} namePrefix={'titles'} index={index} />;
};

export default TitleLandForm;
