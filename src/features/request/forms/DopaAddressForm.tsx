import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormFields } from '@/shared/components/form';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useAddressStore } from '@/shared/store';
import { makeDopaAddressFields } from '../configs/fields';
import {
  addressHasValue,
  addressWithLocality,
  districtOnlyInRecord,
  FREE_TEXT_ADDRESS_KEYS,
  resolveLocality,
  type AddressValue,
} from '../utils/titleList';
import { halfWidthAddressFields } from './addressLayout';

interface DopaAdressFormProps {
  index: number;
  isReadOnly: boolean;
}

const FREE_TEXT = new Set<string>(FREE_TEXT_ADDRESS_KEYS);

/**
 * The address on file at DOPA, with a one-time copy from the title document's address. Nothing
 * follows afterwards: the fields stay editable and later edits to the deed address do not reach them.
 *
 * The sub-district is not copied by code: the Title and DOPA masters have diverged, so a deed's
 * code is not necessarily a DOPA code. The place is looked up in the DOPA master by name; if it is
 * not there the DOPA sub-district is left empty (required, with a hint) for the user to pick. A
 * Title-master code is never written to `dopaAddress`.
 */
const DopaAddressForm = ({ index, isReadOnly }: DopaAdressFormProps) => {
  const { t } = useTranslation(['request', 'common']);
  const fields = useMemo(() => halfWidthAddressFields(makeDopaAddressFields(t)), [t]);
  const { getValues, setValue } = useFormContext();
  const dopaRows = useAddressStore(state => state.dopaAddresses);
  const [confirming, setConfirming] = useState(false);
  // The last copy found no such place in the DOPA master, so the sub-district was left empty.
  const [missedLocality, setMissedLocality] = useState(false);
  // The last copy matched the place by sub-district and province, under another district in DOPA:
  // the district that register has, and the sub-district code it filled, to say so while it stands.
  const [movedDistrict, setMovedDistrict] = useState<{ district: string; code: string } | null>(
    null,
  );

  const titlePath = `titles.${index}.titleAddress`;
  const dopaPath = `titles.${index}.dopaAddress`;
  const titleAddress = useWatch({ name: titlePath }) as AddressValue | undefined;
  const subDistrict = useWatch({ name: `${dopaPath}.subDistrict` }) as string | undefined;

  const copyFromTitle = () => {
    const title = getValues(titlePath) as AddressValue | undefined;
    // Until the DOPA master has loaded nothing can be looked up, so only the typed fields go over.
    const loaded = dopaRows.length > 0;
    const record = loaded ? resolveLocality(title, dopaRows) : undefined;
    Object.entries(addressWithLocality(title, record)).forEach(([key, value]) => {
      if (loaded || FREE_TEXT.has(key))
        setValue(`${dopaPath}.${key}`, value, { shouldDirty: true });
    });
    setMissedLocality(loaded && !record && !!(title?.subDistrict || title?.subDistrictName));
    const district = districtOnlyInRecord(title, record);
    setMovedDistrict(record && district ? { district, code: record.subDistrictCode } : null);
  };

  // Overwriting an address someone typed is never silent.
  const handleCopy = () =>
    addressHasValue(getValues(dopaPath)) ? setConfirming(true) : copyFromTitle();

  return (
    <div className="grid content-start gap-3 rounded-xl border border-gray-200 p-3">
      <div className="flex min-h-7 flex-wrap items-center gap-2">
        <h4 className="m-0 text-sm font-semibold">{t('titleAddress.dopaHeader')}</h4>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={!addressHasValue(titleAddress)}
            className="ml-auto rounded-md px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {t('titleSection.address.copyFromTitle')}
          </button>
        )}
      </div>
      {movedDistrict && subDistrict === movedDistrict.code && (
        <p role="status" className="m-0 text-sm text-amber-700">
          {t('titleSection.address.districtDiffersDopa', { district: movedDistrict.district })}
        </p>
      )}
      {missedLocality && !subDistrict && (
        <p role="status" className="m-0 text-sm text-amber-700">
          {t('titleSection.address.dopaMissing')}
        </p>
      )}
      <div className="grid grid-cols-6 gap-3">
        <FormFields fields={fields} namePrefix="titles" index={index} disabled={isReadOnly} />
      </div>
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          copyFromTitle();
          setConfirming(false);
        }}
        title={t('titleSection.address.overwriteTitle')}
        message={t('titleSection.address.copyOverwriteMessage')}
        confirmText={t('titleSection.address.copyOverwriteConfirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />
    </div>
  );
};

export default DopaAddressForm;
