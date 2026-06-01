import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import { makeTitleMachineFields } from '../configs/fields';

interface TitleMachineFormProps {
  index: number;
}

const TitleMachineForm = ({ index }: TitleMachineFormProps) => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeTitleMachineFields(t), [t]);

  return <FormFields fields={fields} namePrefix={'titles'} index={index} />;
};

export default TitleMachineForm;
