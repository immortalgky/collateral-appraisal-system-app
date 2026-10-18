import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormFields } from '@/shared/components/form';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useAddressStore } from '@/shared/store';
import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import { makeDopaAddressFields } from '../configs/fields';
import {
  addressHasValue,
  addressWithLocality,
  localityName,
  districtOnlyInRecord,
  resolveLocality,
  type AddressValue,
} from '../utils/titleList';
import { halfWidthAddressFields } from './addressLayout';

interface DopaAdressFormProps {
  index: number;
  isReadOnly: boolean;
  /** A movable has no title document: its address is copied from the request's, not the deed's. */
  movable?: boolean;
}

/**
 * The address on file at DOPA, with a one-time copy from another address: the title document's, or
 * for a movable (which has no such document, and whose card is headed as the property location) the
 * request's. Nothing follows afterwards: the fields stay editable and later edits to the source
 * address do not reach them.
 *
 * The Title and DOPA masters have diverged, so a source's sub-district code is not necessarily a
 * DOPA code (a deed's never is; an older request's address may hold a Title-master one too). The
 * place is looked up in the DOPA master by name; if it is not there the DOPA sub-district is left
 * empty (required, with a hint) for the user to pick. A Title-master code is never written to
 * `dopaAddress`.
 *
 * One shortcut, for a movable's copy of the request's address: a DOPA row with the request's
 * sub-district code is taken as the place when its sub-district name is the request's too (code and
 * name agree, so it is surely that place). Otherwise, and when the request carries no name, the
 * place is looked up by name as above, with the same hints. The district hint is not shown after the
 * shortcut, since the request's names are not trusted to say it differs.
 */
const DopaAddressForm = ({ index, isReadOnly, movable = false }: DopaAdressFormProps) => {
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
  const sourcePath = movable ? 'detail.address' : titlePath;
  const sourceAddress = useWatch({ name: sourcePath }) as AddressValue | undefined;
  const subDistrict = useWatch({ name: `${dopaPath}.subDistrict` }) as string | undefined;

  const copyFromSource = () => {
    const source = getValues(sourcePath) as AddressValue | undefined;
    const coded =
      movable && source?.subDistrict
        ? findAddressBySubDistrictCode(source.subDistrict, 'dopa')
        : undefined;
    const byCode =
      coded && localityName(coded.subDistrictName) === localityName(source?.subDistrictName)
        ? coded
        : undefined;
    const record = byCode ?? resolveLocality(source, dopaRows);
    Object.entries(addressWithLocality(source, record)).forEach(([key, value]) =>
      setValue(`${dopaPath}.${key}`, value, { shouldDirty: true }),
    );
    setMissedLocality(!record && !!(source?.subDistrict || source?.subDistrictName));
    // Matched by code, the source's names are not to be trusted to say the district differs.
    const district = byCode ? null : districtOnlyInRecord(source, record);
    setMovedDistrict(record && district ? { district, code: record.subDistrictCode } : null);
  };

  // Overwriting an address someone typed is never silent.
  const handleCopy = () =>
    addressHasValue(getValues(dopaPath)) ? setConfirming(true) : copyFromSource();

  return (
    <div className="grid content-start gap-3 rounded-xl border border-gray-200 p-3">
      <div className="flex min-h-7 flex-wrap items-center gap-2">
        <h4 className="m-0 text-sm font-semibold">
          {t(movable ? 'titleAddress.propertyLocationHeader' : 'titleAddress.dopaHeader')}
        </h4>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleCopy}
            // nothing can be placed until the DOPA master has loaded
            disabled={!addressHasValue(sourceAddress) || dopaRows.length === 0}
            title={
              dopaRows.length === 0
                ? t('titleSection.address.masterUnavailable')
                : !addressHasValue(sourceAddress)
                  ? t(
                      movable
                        ? 'titleSection.address.requestAddressEmpty'
                        : 'titleSection.address.titleAddressEmpty',
                    )
                  : undefined
            }
            className="ml-auto rounded-md px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {t(movable ? 'titleSection.address.useRequest' : 'titleSection.address.copyFromTitle')}
          </button>
        )}
      </div>
      {movedDistrict && subDistrict === movedDistrict.code && (
        <p role="status" className="m-0 text-sm text-amber-700">
          {t(
            movable
              ? 'titleSection.address.districtDiffersRequest'
              : 'titleSection.address.districtDiffersDopa',
            { district: movedDistrict.district },
          )}
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
          copyFromSource();
          setConfirming(false);
        }}
        title={t('titleSection.address.overwriteTitle')}
        message={t(
          movable
            ? 'titleSection.address.copyOverwriteMessageRequest'
            : 'titleSection.address.copyOverwriteMessage',
        )}
        confirmText={t(
          movable
            ? 'titleSection.address.overwriteConfirm'
            : 'titleSection.address.copyOverwriteConfirm',
        )}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />
    </div>
  );
};

export default DopaAddressForm;
