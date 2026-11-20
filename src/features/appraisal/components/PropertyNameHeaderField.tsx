import { useContext, useId } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { FieldLabelContext, type FormField } from '@/shared/components/form';
import { REQUIRED_MARK } from '@/shared/components/inputs/controlStyles';
import TextInput from '@/shared/components/inputs/TextInput';
import { buildingInfoField, condoFields, landInfoField } from '../configs/fields';
import { FieldLabels, type FieldLabelScope } from './FieldLabels';
import { PropertyNameTriggerIcon, type PropertyType } from './PropertyNameTriggerIcon';

// A building has its own wording ("Building Name"); every other form says "Property Name". The
// scope picks both the label and the field config the name is read from.
const SCOPE: Partial<Record<PropertyType, FieldLabelScope>> = {
  B: 'building',
  LSB: 'building',
  U: 'condo',
  LSU: 'condo',
};
const CONFIG: Partial<Record<FieldLabelScope, FormField[]>> = {
  building: buildingInfoField,
  condo: condoFields,
};
const nameConfig = (scope: FieldLabelScope) =>
  (CONFIG[scope] ?? landInfoField).find(f => f.name === 'propertyName') as FormField;

function NameInput({ propertyType, config }: { propertyType: PropertyType; config: FormField }) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: 'propertyName', control });
  const relabel = useContext(FieldLabelContext);
  const id = useId();
  const labelled = relabel ? relabel(config) : config;

  return (
    <div data-field="propertyName" className="flex min-w-0 flex-1 items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-xs font-medium text-(--palette-ink-2)">
        {labelled.label}
        {config.required && <span className={REQUIRED_MARK}>*</span>}
      </label>
      <div className="min-w-[12rem] max-w-[32rem] flex-1">
        <TextInput
          {...field}
          value={field.value ?? ''}
          id={id}
          maxLength={config.type === 'text-input' ? config.maxLength : undefined}
          required={config.required}
          error={fieldState.error?.message}
          rightIcon={<PropertyNameTriggerIcon propertyType={propertyType} />}
          className="font-semibold"
        />
      </div>
    </div>
  );
}

/**
 * The property name, edited in the page header beside its type chip. The same form value
 * (`propertyName`) the detail forms used to draw, so save, dirty state and validation are
 * unchanged; its length, required mark and label come from the field's own config, and the fill
 * icon sits inside the input as it did there.
 */
export function PropertyNameHeaderField({ propertyType }: { propertyType: PropertyType }) {
  const scope = SCOPE[propertyType] ?? 'land';
  return (
    <FieldLabels scope={scope}>
      <NameInput propertyType={propertyType} config={nameConfig(scope)} />
    </FieldLabels>
  );
}
