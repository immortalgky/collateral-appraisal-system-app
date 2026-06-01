import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { makeTitleBuildingFields, makeTitleBuildingFieldsAlt } from '../configs/fields';

interface TitleBuildingFormProps {
  index: number;
  variant?: 2 | 3;
}

const TitleBuildingForm = ({ index, variant = 3 }: TitleBuildingFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(
    () => (variant === 3 ? makeTitleBuildingFields(t) : makeTitleBuildingFieldsAlt(t)),
    [t, variant],
  );

  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleBuildingForm;
