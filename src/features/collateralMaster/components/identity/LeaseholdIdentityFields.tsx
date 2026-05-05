import clsx from 'clsx';

export interface LeaseholdIdentityValues {
  contractNo?: string;
  underlyingMasterId?: string;
  lessor?: string;
  lessee?: string;
  leaseTermStart?: string;
}

interface LeaseholdIdentityFieldsProps {
  values: LeaseholdIdentityValues;
  onChange: (partial: Partial<LeaseholdIdentityValues>) => void;
  locked?: boolean;
  /** Optional display label for the underlying master (resolved from ID) */
  underlyingLabel?: string;
  className?: string;
}

export function LeaseholdIdentityFields({
  values,
  onChange,
  locked = false,
  underlyingLabel,
  className,
}: LeaseholdIdentityFieldsProps) {
  const inputClass = clsx(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    locked
      ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
      : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white',
  );

  return (
    <div className={clsx('grid grid-cols-2 gap-3', className)}>
      {/* Lease Registration No (Tor Dor 11) */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Lease Registration No (ท.ด.11) <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.contractNo ?? ''}
          onChange={e => onChange({ contractNo: e.target.value })}
          disabled={locked}
          placeholder="เลขที่สัญญาเช่า"
          className={inputClass}
        />
      </div>

      {/* Underlying master ID / picker */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Underlying Property (Land or Condo) <span className="text-danger">*</span>
        </label>
        {locked && underlyingLabel ? (
          <div className={inputClass}>{underlyingLabel}</div>
        ) : (
          <input
            type="text"
            value={values.underlyingMasterId ?? ''}
            onChange={e => onChange({ underlyingMasterId: e.target.value })}
            disabled={locked}
            placeholder="Underlying master ID"
            className={inputClass}
          />
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          Enter the collateral master ID of the underlying Land or Condo
        </p>
      </div>

      {/* Lessor */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Lessor <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.lessor ?? ''}
          onChange={e => onChange({ lessor: e.target.value })}
          disabled={locked}
          placeholder="ผู้ให้เช่า"
          className={inputClass}
        />
      </div>

      {/* Lessee */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Lessee <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.lessee ?? ''}
          onChange={e => onChange({ lessee: e.target.value })}
          disabled={locked}
          placeholder="ผู้เช่า"
          className={inputClass}
        />
      </div>

      {/* Lease Term Start */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Lease Term Start <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          value={values.leaseTermStart ?? ''}
          onChange={e => onChange({ leaseTermStart: e.target.value })}
          disabled={locked}
          className={inputClass}
        />
      </div>

      {locked && (
        <p className="col-span-2 text-xs text-amber-600">
          Identity fields are locked for reappraisal
        </p>
      )}
    </div>
  );
}

export default LeaseholdIdentityFields;
