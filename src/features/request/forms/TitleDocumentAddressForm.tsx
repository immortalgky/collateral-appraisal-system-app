import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormFields } from '@/shared/components/form';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useAddressStore } from '@/shared/store';
import { makeTitleAddressFields } from '../configs/fields';
import {
  addressHasValue,
  addressWithLocality,
  districtOnlyInRecord,
  resolveLocality,
  type AddressValue,
} from '../utils/titleList';
import { halfWidthAddressFields } from './addressLayout';

interface TitleDocumentAdressFormProps {
  index: number;
  isReadOnly: boolean;
}

/** The address printed on the title document, with a shortcut to fill it from the request's address. */
const TitleDocumentAddressForm = ({ index, isReadOnly }: TitleDocumentAdressFormProps) => {
  const { t } = useTranslation(['request', 'common']);
  const fields = useMemo(() => halfWidthAddressFields(makeTitleAddressFields(t)), [t]);
  const { getValues, setValue } = useFormContext();
  const titleRows = useAddressStore(state => state.titleAddresses);
  const [confirming, setConfirming] = useState(false);
  // The last copy found no such place in the Title master, so the sub-district was left empty.
  const [missedLocality, setMissedLocality] = useState(false);
  // The last copy matched the place by sub-district and province, under another district in the
  // Title master: that district, and the sub-district code filled, to say so while it stands.
  const [movedDistrict, setMovedDistrict] = useState<{ district: string; code: string } | null>(
    null,
  );
  const subDistrict = useWatch({ name: `titles.${index}.titleAddress.subDistrict` }) as
    | string
    | undefined;

  const prefix = `titles.${index}.titleAddress`;
  const requestAddress = useWatch({ name: 'detail.address' }) as AddressValue | undefined;

  // The request's address is picked from the DOPA master and a title's from the Title master, which
  // number places differently: the typed fields are copied, the locality is looked up in the Title
  // master by name, and left empty (to be picked) when it is not there.
  const copyFromRequest = () => {
    const request = getValues('detail.address') as AddressValue | undefined;
    const record = resolveLocality(request, titleRows);
    Object.entries(addressWithLocality(request, record)).forEach(([key, value]) =>
      setValue(`${prefix}.${key}`, value, { shouldDirty: true }),
    );
    setMissedLocality(!record && !!(request?.subDistrict || request?.subDistrictName));
    const district = districtOnlyInRecord(request, record);
    setMovedDistrict(record && district ? { district, code: record.subDistrictCode } : null);
  };

  // Overwriting an address someone typed is never silent.
  const handleUseRequestAddress = () =>
    addressHasValue(getValues(prefix)) ? setConfirming(true) : copyFromRequest();

  return (
    <div className="grid content-start gap-3 rounded-xl border border-(--palette-line) p-3">
      <div className="flex min-h-7 flex-wrap items-center gap-2">
        <h4 className="m-0 text-sm font-semibold">{t('titleAddress.header')}</h4>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleUseRequestAddress}
            // the locality is looked up in the Title master, so nothing can be placed until it loads;
            // and an empty request address would only blank a typed one
            disabled={!addressHasValue(requestAddress) || titleRows.length === 0}
            title={
              titleRows.length === 0
                ? t('titleSection.address.masterUnavailable')
                : !addressHasValue(requestAddress)
                  ? t('titleSection.address.requestAddressEmpty')
                  : undefined
            }
            className="ml-auto rounded-md px-2 py-1 text-sm text-(--palette-primary-text) transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {t('titleSection.address.useRequest')}
          </button>
        )}
      </div>
      {movedDistrict && subDistrict === movedDistrict.code && (
        <p role="status" className="m-0 text-sm text-(--palette-warn)">
          {t('titleSection.address.districtDiffersTitle', { district: movedDistrict.district })}
        </p>
      )}
      {missedLocality && !subDistrict && (
        <p role="status" className="m-0 text-sm text-(--palette-warn)">
          {t('titleSection.address.titleMissing')}
        </p>
      )}
      <div className="grid grid-cols-6 gap-3">
        <FormFields fields={fields} namePrefix="titles" index={index} />
      </div>
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          copyFromRequest();
          setConfirming(false);
        }}
        title={t('titleSection.address.overwriteTitle')}
        message={t('titleSection.address.overwriteMessage')}
        confirmText={t('titleSection.address.overwriteConfirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />
    </div>
  );
};

export default TitleDocumentAddressForm;
