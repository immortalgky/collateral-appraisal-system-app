import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import {
  landPmaTitleFields,
  landPmaAreaFields,
  landPmaAddressFields,
  pmaField,
} from '../configs/fields';
import { FieldLabels } from '../components/FieldLabels';
import { useForcedSalePriceDefault } from '../hooks/useForcedSalePriceDefault';
import FieldGroupLabel from './FieldGroupLabel';
import SectionRow from '../components/SectionRow';

const LandBuildingPMAForm = () => {
  const { t } = useTranslation('appraisal');
  // Keep the read-only Total Sq.Wa in sync with Rai/Ngan/Sq.Wa (Rai*400 + Ngan*100 + Sq.Wa).
  // The land-area requirement is validated on this total (must be > 0) in the form schema.
  const { control, setValue } = useFormContext();
  const [areaRai, areaNgan, areaSquareWa] = useWatch({
    control,
    name: ['areaRai', 'areaNgan', 'areaSquareWa'],
  });
  useEffect(() => {
    const total =
      (Number(areaRai) || 0) * 400 + (Number(areaNgan) || 0) * 100 + (Number(areaSquareWa) || 0);
    setValue('totalSquareWa', Math.round(total * 100) / 100, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [areaRai, areaNgan, areaSquareWa, setValue]);

  useForcedSalePriceDefault();

  return (
    <FieldLabels scope="landBuildingPma">
      <div className="w-full max-w-full overflow-hidden">
        <div className="cas-section-grid cas-sheet grid grid-cols-1 xl:grid-cols-5 gap-x-6 gap-y-4">
          <SectionRow spacedRule title={t('forms.pma.groups.titleInfo')} icon="scroll">
            <FormFields fields={landPmaTitleFields} />
            <FormFields fields={landPmaAreaFields} />
            <FieldGroupLabel label={t('forms.pma.groups.titleAddress')} />
            <FormFields fields={landPmaAddressFields} />
          </SectionRow>

          <SectionRow spacedRule title={t('forms.pma.groups.value')} icon="money-bill" isLast>
            <FormFields fields={pmaField} />
          </SectionRow>
        </div>
      </div>
    </FieldLabels>
  );
};

export default LandBuildingPMAForm;
