import clsx from 'clsx';

// ─── Static data ──────────────────────────────────────────────────────────────

export const TITLE_DEED_TYPE_OPTIONS = [
  { value: 'Chanote', label: 'โฉนดที่ดิน (Chanote)' },
  { value: 'NorSor3', label: 'น.ส.3 (NorSor3)' },
  { value: 'NorSor3Kor', label: 'น.ส.3ก (NorSor3Kor)' },
  { value: 'SorKor1', label: 'ส.ค.1 (SorKor1)' },
] as const;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface LandIdentityValues {
  landOfficeCode?: string;
  province?: string;
  amphur?: string;
  tambon?: string;
  titleDeedType?: string;
  titleDeedNo?: string;
  surveyOrParcelNo?: string;
}

interface LandIdentityFieldsProps {
  values: LandIdentityValues;
  onChange: (partial: Partial<LandIdentityValues>) => void;
  locked?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders the Land dedup-key identity fields.
 * Used standalone in lookup/prefill and reappraisal flows.
 * `locked` renders all fields as read-only (reappraisal identity lock).
 */
export function LandIdentityFields({
  values,
  onChange,
  locked = false,
  className,
}: LandIdentityFieldsProps) {
  const inputClass = clsx(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    locked
      ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
      : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white',
  );

  const selectClass = clsx(inputClass, 'pr-8 appearance-none');

  return (
    <div className={clsx('grid grid-cols-2 gap-3', className)}>
      {/* Land Office Code */}
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

      {/* Province */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Province <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.province ?? ''}
          onChange={e => onChange({ province: e.target.value })}
          disabled={locked}
          placeholder="จังหวัด"
          className={inputClass}
        />
      </div>

      {/* Amphur */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Amphur <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.amphur ?? ''}
          onChange={e => onChange({ amphur: e.target.value })}
          disabled={locked}
          placeholder="อำเภอ/เขต"
          className={inputClass}
        />
      </div>

      {/* Tambon */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Tambon <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.tambon ?? ''}
          onChange={e => onChange({ tambon: e.target.value })}
          disabled={locked}
          placeholder="ตำบล/แขวง"
          className={inputClass}
        />
      </div>

      {/* Title Deed Type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Title Deed Type <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <select
            value={values.titleDeedType ?? ''}
            onChange={e => onChange({ titleDeedType: e.target.value })}
            disabled={locked}
            className={selectClass}
          >
            <option value="">Select type...</option>
            {TITLE_DEED_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title Deed No */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Title Deed No <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={values.titleDeedNo ?? ''}
          onChange={e => onChange({ titleDeedNo: e.target.value })}
          disabled={locked}
          placeholder="เลขที่โฉนด"
          className={inputClass}
        />
      </div>

      {/* Survey / Parcel No */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Survey / Parcel No
        </label>
        <input
          type="text"
          value={values.surveyOrParcelNo ?? ''}
          onChange={e => onChange({ surveyOrParcelNo: e.target.value })}
          disabled={locked}
          placeholder="เลขที่ดิน / ระวาง (optional)"
          className={inputClass}
        />
      </div>

      {locked && (
        <p className="col-span-2 text-xs text-amber-600 flex items-center gap-1">
          <span>Identity fields are locked for reappraisal</span>
        </p>
      )}
    </div>
  );
}

export default LandIdentityFields;
