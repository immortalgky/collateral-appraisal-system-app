import clsx from 'clsx';

export interface CondoIdentityValues {
  landOfficeCode?: string;
  condoRegistrationNumber?: string;
  buildingNumber?: string;
  floorNumber?: string;
  unitNumber?: string;
  titleNumber?: string;
  titleType?: string;
}

interface CondoIdentityFieldsProps {
  values: CondoIdentityValues;
  onChange: (partial: Partial<CondoIdentityValues>) => void;
  locked?: boolean;
  className?: string;
}

const TITLE_TYPE_OPTIONS = [
  { value: 'OwnershipCertificate', label: 'หนังสือกรรมสิทธิ์ห้องชุด' },
  { value: 'Other', label: 'อื่น ๆ' },
];

export function CondoIdentityFields({
  values,
  onChange,
  locked = false,
  className,
}: CondoIdentityFieldsProps) {
  const inputClass = clsx(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    locked
      ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
      : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white',
  );

  return (
    <div className={clsx('grid grid-cols-2 gap-3', className)}>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Land Office Code <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.landOfficeCode ?? ''}
          onChange={e => onChange({ landOfficeCode: e.target.value })}
          disabled={locked}
          placeholder="e.g. BKK01"
          className={inputClass}
        />
      </div>

      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Condo Registration Number <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.condoRegistrationNumber ?? ''}
          onChange={e => onChange({ condoRegistrationNumber: e.target.value })}
          disabled={locked}
          placeholder="เลขที่จดทะเบียนอาคารชุด"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Building <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.buildingNumber ?? ''}
          onChange={e => onChange({ buildingNumber: e.target.value })}
          disabled={locked}
          placeholder="อาคาร"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Floor <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.floorNumber ?? ''}
          onChange={e => onChange({ floorNumber: e.target.value })}
          disabled={locked}
          placeholder="ชั้น"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Unit <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.unitNumber ?? ''}
          onChange={e => onChange({ unitNumber: e.target.value })}
          disabled={locked}
          placeholder="เลขห้อง"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Title Number <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.titleNumber ?? ''}
          onChange={e => onChange({ titleNumber: e.target.value })}
          disabled={locked}
          placeholder="เลขที่ห้องชุด"
          className={inputClass}
        />
      </div>

      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Title Type <span className="text-danger">*</span>
        </label>
        <select
          value={values.titleType ?? ''}
          onChange={e => onChange({ titleType: e.target.value })}
          disabled={locked}
          className={inputClass}
        >
          <option value="">Select type...</option>
          {TITLE_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {locked && (
        <p className="col-span-2 text-xs text-amber-600">
          Identity fields are locked for reappraisal
        </p>
      )}
    </div>
  );
}

export default CondoIdentityFields;
