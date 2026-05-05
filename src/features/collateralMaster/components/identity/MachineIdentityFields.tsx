import clsx from 'clsx';

export interface MachineIdentityValues {
  machineRegistrationNo?: string;
  serialNo?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
}

interface MachineIdentityFieldsProps {
  values: MachineIdentityValues;
  onChange: (partial: Partial<MachineIdentityValues>) => void;
  locked?: boolean;
  className?: string;
}

export function MachineIdentityFields({
  values,
  onChange,
  locked = false,
  className,
}: MachineIdentityFieldsProps) {
  const inputClass = clsx(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    locked
      ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
      : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white',
  );

  const hasRegistrationNo = !!values.machineRegistrationNo?.trim();
  const usingComposite = !hasRegistrationNo;

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      {/* Hint */}
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        Provide <strong>Machine Registration No</strong> (preferred) OR fill in the composite key
        (Serial No + Brand + Model + Manufacturer). At least one path is required.
      </p>

      {/* Tier 1 — Registration No */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Machine Registration No{' '}
          {!usingComposite && <span className="text-danger">*</span>}
          {usingComposite && <span className="text-gray-400 font-normal">(optional)</span>}
        </label>
        <input
          type="text"
          value={values.machineRegistrationNo ?? ''}
          onChange={e => onChange({ machineRegistrationNo: e.target.value })}
          disabled={locked}
          placeholder="จดทะเบียนเครื่องจักร"
          className={inputClass}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400 shrink-0">OR use composite key</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Tier 2 — Composite */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Serial No{usingComposite && <span className="text-danger"> *</span>}
          </label>
          <input
            type="text"
            value={values.serialNo ?? ''}
            onChange={e => onChange({ serialNo: e.target.value })}
            disabled={locked || hasRegistrationNo}
            placeholder="Serial number"
            className={clsx(
              inputClass,
              hasRegistrationNo && !locked && 'opacity-50 cursor-not-allowed',
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Brand{usingComposite && <span className="text-danger"> *</span>}
          </label>
          <input
            type="text"
            value={values.brand ?? ''}
            onChange={e => onChange({ brand: e.target.value })}
            disabled={locked || hasRegistrationNo}
            placeholder="Brand"
            className={clsx(
              inputClass,
              hasRegistrationNo && !locked && 'opacity-50 cursor-not-allowed',
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Model{usingComposite && <span className="text-danger"> *</span>}
          </label>
          <input
            type="text"
            value={values.model ?? ''}
            onChange={e => onChange({ model: e.target.value })}
            disabled={locked || hasRegistrationNo}
            placeholder="Model"
            className={clsx(
              inputClass,
              hasRegistrationNo && !locked && 'opacity-50 cursor-not-allowed',
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Manufacturer{usingComposite && <span className="text-danger"> *</span>}
          </label>
          <input
            type="text"
            value={values.manufacturer ?? ''}
            onChange={e => onChange({ manufacturer: e.target.value })}
            disabled={locked || hasRegistrationNo}
            placeholder="Manufacturer"
            className={clsx(
              inputClass,
              hasRegistrationNo && !locked && 'opacity-50 cursor-not-allowed',
            )}
          />
        </div>
      </div>

      {locked && (
        <p className="text-xs text-amber-600">
          Identity fields are locked for reappraisal
        </p>
      )}
    </div>
  );
}

export default MachineIdentityFields;
