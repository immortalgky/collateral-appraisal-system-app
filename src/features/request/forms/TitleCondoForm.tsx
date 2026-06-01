import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { makeTitleCondoFields } from '../configs/fields';

interface TitleCondoFormProps {
  index: number;
}

const TitleCondoForm = ({ index }: TitleCondoFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeTitleCondoFields(t), [t]);

  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleCondoForm;
