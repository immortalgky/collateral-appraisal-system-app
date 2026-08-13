import { Badge } from '@/shared/components';
import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { useRelativeTime } from '@/shared/hooks/useFormatters';
import { pmaField, condoPmaDetailFields, condoPmaAddressFields } from '../configs/fields';
import { useFormContext, useWatch } from 'react-hook-form';
import { useEffect } from 'react';

type CondoPMAFormProps = {
  externalSyncStatus?: string | null;
  externalSyncError?: string | null;
  externalSyncedAt?: string | null;
};

const CondoPMAForm = ({
  externalSyncStatus,
  externalSyncError,
  externalSyncedAt,
}: CondoPMAFormProps) => {
  const relTime = useRelativeTime();
  const synced = externalSyncedAt ? relTime(externalSyncedAt) : null;

  const { setValue } = useFormContext();
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
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Icon name="city" style="solid" className="w-5 h-5 text-blue-600" />
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
        <div className="grid grid-cols-9 gap-4">
          <FormFields fields={condoPmaDetailFields} />
        </div>

        {/* Address sub-group */}
        <div className="mt-5">
          <div className="text-xs font-medium text-primary mb-2">Address</div>
          <div className="grid grid-cols-9 gap-4">
            <FormFields fields={condoPmaAddressFields} />
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

export default CondoPMAForm;
