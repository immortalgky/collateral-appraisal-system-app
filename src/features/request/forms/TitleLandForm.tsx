import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { makeTitleLandFields } from '../configs/fields';

interface TitleLandFormProps {
  index: number;
  variant?: 'land' | 'landAndBuilding';
  /** Only these fields, by config name. Omit for the whole land form. */
  include?: readonly string[];
}

const TitleLandForm = ({ index, include }: TitleLandFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(
    () => makeTitleLandFields(t).filter(field => !include || include.includes(field.name)),
    [t, include],
  );

  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleLandForm;
