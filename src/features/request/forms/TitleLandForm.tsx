import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { makeTitleLandFields } from '../configs/fields';

interface TitleLandFormProps {
  index: number;
  variant?: 'land' | 'landAndBuilding';
}

const TitleLandForm = ({ index }: TitleLandFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeTitleLandFields(t), [t]);

  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleLandForm;
