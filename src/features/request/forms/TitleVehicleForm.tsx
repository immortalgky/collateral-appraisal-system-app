import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { makeTitleVehicleFields } from '../configs/fields';

interface TitleVehicleFormProps {
  index: number;
}

const TitleVehicleForm = ({ index }: TitleVehicleFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeTitleVehicleFields(t), [t]);

  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleVehicleForm;
