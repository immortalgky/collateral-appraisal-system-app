import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Badge } from '@/shared/components';
import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { useRelativeTime } from '@/shared/hooks/useFormatters';
import {
  landPmaTitleFields,
  landPmaAreaFields,
  landPmaAddressFields,
  pmaField,
} from '../configs/fields';

type LandBuildingPMAFormProps = {
  externalSyncStatus?: string | null;
  externalSyncError?: string | null;
  externalSyncedAt?: string | null;
};

const LandBuildingPMAForm = ({
  externalSyncStatus,
  externalSyncError,
  externalSyncedAt,
}: LandBuildingPMAFormProps) => {
  const relTime = useRelativeTime();
  const synced = externalSyncedAt ? relTime(externalSyncedAt) : null;

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

  const sellingPrice = useWatch({ name: 'sellingPrice' });

  useEffect(() => {
    const forceSalePrice = (sellingPrice * 70) / 100;
    setValue('forcedSalePrice', Math.round(forceSalePrice * 100) / 100, { shouldDirty: true });
  }, [sellingPrice, setValue]);

  return (
    <div className="flex flex-col gap-6">
      {/* Property Section — sync status badge sits on this header line */}
      <div id="property-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Icon name="house-chimney" style="solid" className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Updating PMA Property</h2>
          </div>
          {externalSyncStatus && externalSyncStatus !== 'NotSynced' && (
            <div
              className="flex items-center gap-2 shrink-0"
              title={externalSyncStatus === 'Failed' ? (externalSyncError ?? undefined) : undefined}
            >
              {externalSyncStatus === 'Delivered' && (
                <>
                  <Badge type="externalSyncStatus" value="Delivered" size="sm">
                    Synced
                  </Badge>
                  {synced && (
                    <span className="text-xs text-gray-400" title={synced.absolute}>
                      · {synced.relative}
                    </span>
                  )}
                </>
              )}
              {externalSyncStatus === 'Pending' && (
                <Badge type="externalSyncStatus" value="Pending" size="sm">
                  Pending sync
                </Badge>
              )}
              {externalSyncStatus === 'Failed' && (
                <>
                  <Badge type="externalSyncStatus" value="Failed" size="sm">
                    Sync failed
                  </Badge>
                  <span className="text-xs text-gray-400">· Save to retry</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="h-px bg-gray-200 mb-4" />
        <div className="text-xs font-medium text-primary mb-2">Title Information</div>
        <div className="grid grid-cols-12 gap-4">
          <FormFields fields={landPmaTitleFields} />
          <FormFields fields={landPmaAreaFields} />
        </div>

        {/* Address sub-group */}
        <div className="mt-5">
          <div className="text-xs font-medium text-primary mb-2">Address</div>
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={landPmaAddressFields} />
          </div>
        </div>
      </div>

      {/* Value Section (prices) */}
      <div id="value-section">
        <div className="text-xs font-medium text-primary mb-2">Value Information</div>
        <div className="grid grid-cols-9 gap-4">
          <FormFields fields={pmaField} />
        </div>
      </div>
    </div>
  );
};
export default LandBuildingPMAForm;
