import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { makeTitleVesselFields } from '../configs/fields';

interface TitleVesselFormProps {
  index: number;
}

const TitleVesselForm = ({ index }: TitleVesselFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeTitleVesselFields(t), [t]);

  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleVesselForm;
