import {
  type Control,
  type FieldValues,
  useController,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useContext, useEffect, useId, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { z } from 'zod';

import Dropdown from '../inputs/Dropdown';
import { HELPER_TEXT } from '../inputs/controlStyles';
import Icon from '../Icon';
import NumberInput from '../inputs/NumberInput';
import TextInput from '../inputs/TextInput';
import DateInput from '../inputs/DateInput';
import Textarea from '../inputs/Textarea';
import DateTimeInput from '../inputs/DateTimeInput';
import SelectInput from '../inputs/SelectInput';
import FormStringToggle from '../inputs/FormStringToggle';
import FormBooleanToggle from '../inputs/FormBooleanToggle';
import FormCheckbox from '../inputs/FormCheckbox';
import FormCheckboxGroup from '../inputs/FormCheckboxGroup';
import FormRadioGroup from '../inputs/FormRadioGroup';
import FormSwitch from '../inputs/FormSwitch';
import AppraisalSelector from '../inputs/AppraisalSelector';
import LocationSelector from '../inputs/LocationSelector';

import { FieldLabelContext, useFormReadOnly, useFormSchema } from './context';
import { constraintsToInputProps, getFieldConstraints } from './utils';
import {
  evaluateConditions,
  extractConditionFields,
  getNestedValue,
  isFieldConditions,
  setNestedValue,
} from './conditions';
import FieldHelp from './FieldHelp';
import { FormFieldShell } from './FormFieldShell';
import { useFormLayout } from './formLayoutContext';
import { FormSectionBodyContext } from './formSheetContext';
import { FormReadValue, READ_TYPES } from './FormReadValue';
import { ValidationLabelContext } from './validationMessage';
import { COMPACT_FULL_ROW, compactJoins } from './compactPairs';
import { isChipGroup, rowGroupRoles, togglePairs, type RowGroupRole } from './rowGroups';
import type { BooleanChips, FlowGroup, FormField, FormFieldItem } from './types';
import { BooleanChipsField } from './BooleanChips';
import { useFilterWatchValues } from '@/shared/hooks/useFilterWatchValues';
import ParameterSearchInput from '../inputs/ParameterSearchInput';
import type { OtherSpec } from '../inputs/OtherText';

// =============================================================================
// Field State Hook
// =============================================================================

interface UseFieldStateOptions {
  field: FormField;
  namePrefix: string;
  index?: number;
}

/**
 * Hook to compute field visibility, disabled, and required state based on conditions.
 * Uses targeted useWatch to only subscribe to the specific fields that conditions depend on,
 * preventing unnecessary re-renders when unrelated form fields change.
 */
function useFieldState({ field, namePrefix, index }: UseFieldStateOptions) {
  const hasConditions = !!(
    field.showWhen ||
    field.hideWhen ||
    field.disableWhen ||
    field.enableWhen ||
    field.requiredWhen
  );

  // Collect only the field names this field's conditions depend on
  const watchFields = useMemo(() => {
    if (!hasConditions) return [] as string[];
    const fields: string[] = [];
    for (const cond of [
      field.showWhen,
      field.hideWhen,
      field.disableWhen,
      field.enableWhen,
      field.requiredWhen,
    ]) {
      fields.push(...extractConditionFields(cond, namePrefix, index));
    }
    return [...new Set(fields)];
  }, [
    field.showWhen,
    field.hideWhen,
    field.disableWhen,
    field.enableWhen,
    field.requiredWhen,
    namePrefix,
    index,
    hasConditions,
  ]);

  // Only subscribe to the specific fields that conditions reference
  const watchedValues = useWatch({ name: watchFields });

  // Build a values object that evaluateConditions can traverse via getNestedValue
  const values = useMemo(() => {
    if (!hasConditions || watchFields.length === 0) return {};
    const obj: Record<string, unknown> = {};
    watchFields.forEach((fieldName, i) => {
      setNestedValue(
        obj,
        fieldName,
        Array.isArray(watchedValues) ? watchedValues[i] : watchedValues,
      );
    });
    return obj;
  }, [hasConditions, watchFields, watchedValues]);

  // Calculate visibility
  let isVisible = true;
  if (field.showWhen) {
    isVisible = evaluateConditions(field.showWhen, values, namePrefix, index);
  } else if (field.hideWhen) {
    isVisible = !evaluateConditions(field.hideWhen, values, namePrefix, index);
  }

  // Calculate disabled state
  let isDisabled = field.disabled ?? false;
  if (!isDisabled && field.disableWhen) {
    isDisabled = evaluateConditions(field.disableWhen, values, namePrefix, index);
  } else if (isDisabled && field.enableWhen) {
    isDisabled = !evaluateConditions(field.enableWhen, values, namePrefix, index);
  }

  // Calculate required state
  let isRequired = field.required ?? false;
  if (field.requiredWhen) {
    isRequired = evaluateConditions(field.requiredWhen, values, namePrefix, index);
  }

  return { isVisible, isDisabled, isRequired };
}

// =============================================================================
// Component Interfaces
// =============================================================================

interface FormFieldsProps {
  /** Array of field configurations to render; a flow group (see `flowGroup()`) draws a toggle row with its follow-ups. */
  fields: FormFieldItem[];
  /** Prefix for nested field names (e.g., "address" for "address.street") */
  namePrefix?: string;
  /** Index for array fields */
  index?: number;
  /**
   * Zod schema for auto-extracting validation constraints.
   * If not provided, will try to get from FormProvider context.
   */
  schema?: z.ZodObject<any>;
  /** Show character count for text fields with maxLength */
  showCharCount?: boolean;
  /** Disable all fields in this group (e.g. when user has no edit permission). Existing per-field disabled rules still apply. */
  disabled?: boolean;
}

interface FieldRendererProps {
  control: Control<FieldValues, any, FieldValues>;
  field: FormField;
  namePrefix?: string;
  index?: number;
  schema?: z.ZodObject<any>;
  globalShowCharCount?: boolean;
  globalDisabled?: boolean;
  /** Part of a run of fields that makes one full row (`rowGroupRoles`). */
  rowGroup?: RowGroupRole;
  /** A chip group's "other" companion, typed inside its chip. */
  other?: OtherSpec;
  /** An "other" companion drawn by its chip group: runs its rules, draws nothing. */
  folded?: boolean;
  /** One control of a joined Compact row (`compactPairs.ts`): no label cell of its own, the row's shell draws it. */
  bare?: boolean;
}

/** The form path of a field name under a prefix and an array index. */
function fullFieldName(name: string, namePrefix: string, index?: number): string {
  let full = name;
  if (index !== undefined) full = `${index}.${full}`;
  if (namePrefix !== undefined && namePrefix.trim() !== '') full = `${namePrefix}.${full}`;
  return full;
}

/**
 * An inline "อื่นๆ" text is longer than this and stays a separate textarea: one line in the chip
 * would not hold it.
 */
const MAX_INLINE_OTHER = 200;

type FieldSchema = Parameters<typeof getFieldConstraints>[0] | undefined;

/**
 * Pairs each chip group with its "other" companion: a text field in the same list whose only
 * `showWhen` is the group holding one option value ('99'). The companion keeps rendering its hooks
 * (clear-on-hide, required) but draws nothing; the chip draws the input.
 */
function pairOthers(fields: FormField[], schema: FieldSchema, namePrefix: string, index?: number) {
  const others = new Map<string, OtherSpec>();
  const folded = new Set<string>();
  for (const chip of fields) {
    if (chip.type !== 'checkbox-group' && chip.type !== 'radio-group') continue;
    if (chip.type === 'radio-group' && chip.variant === 'card') continue;
    const operator = chip.type === 'checkbox-group' ? 'contains' : 'equals';
    const companion = fields.find(f => {
      const w = f.showWhen;
      return (
        (f.type === 'textarea' || f.type === 'text-input') &&
        !f.hide &&
        !!w &&
        typeof w === 'object' &&
        !isFieldConditions(w) &&
        w.field === chip.name &&
        typeof w.is === 'string' &&
        (w.operator ?? 'equals') === operator &&
        !folded.has(f.name)
      );
    });
    if (!companion || (companion.type !== 'textarea' && companion.type !== 'text-input')) continue;
    const name = fullFieldName(companion.name, namePrefix, index);
    const maxLength =
      companion.maxLength ?? (schema ? getFieldConstraints(schema, name).maxLength : undefined);
    if (maxLength === undefined || maxLength > MAX_INLINE_OTHER) continue;
    const w = companion.showWhen as { is: string };
    others.set(chip.name, {
      name,
      is: w.is,
      maxLength,
      label: companion.label,
      required: !!(companion.required || companion.requiredWhen),
    });
    folded.add(companion.name);
  }
  return { others, folded };
}

/**
 * Renders a group of form fields based on configuration.
 *
 * Features:
 * - Declarative field configuration via array
 * - Automatic validation constraint extraction from Zod schema
 * - Support for nested fields (namePrefix) and array fields (index)
 * - Character count display for text fields
 * - The field wrapper (DESIGN.md 17.4): label above the control in Standard; in Compact, inside a
 *   `FormSection`, a label-left pair that sits two to a row on a wide sheet
 *
 * @example
 * ```tsx
 * const fields: FormField[] = [
 *   { type: 'text-input', name: 'name', label: 'Name' },
 *   { type: 'text-input', name: 'email', label: 'Email' },
 *   { type: 'number-input', name: 'age', label: 'Age', decimalPlaces: 0 },
 * ];
 *
 * <FormFields fields={fields} showCharCount />
 * ```
 */
function PlainFields({
  fields,
  namePrefix = '',
  index,
  schema: schemaProp,
  showCharCount,
  disabled,
}: Omit<FormFieldsProps, 'fields'> & { fields: FormField[] }) {
  const { control } = useFormContext();
  // Use schema from props, or fall back to context from FormProvider
  const contextSchema = useFormSchema();
  const schema = schemaProp ?? contextSchema;
  const relabel = useContext(FieldLabelContext);
  const visible = fields.filter(f => !f.hide);
  const shown = relabel ? visible.map(relabel) : visible;
  const { others, folded } = pairOthers(
    shown,
    schema as z.ZodObject<any> | undefined,
    namePrefix,
    index,
  );
  // A folded companion draws nothing, so it takes no part in the row groups.
  const layout = useFormLayout();
  const inSectionBody = useContext(FormSectionBodyContext);
  const standardBody = layout === 'standard' && inSectionBody;
  // A chip group ends a run in either layout inside a section body: Standard gives it the whole row,
  // and in Compact it is a pair of its own (a run is counted by what is drawn, not by its Standard
  // span, or a 6-wide chip group would pull the next two halves out of step).
  const roles = rowGroupRoles(
    shown.filter(f => !folded.has(f.name)),
    inSectionBody,
  );
  let drawn = 0;

  // Standard: a toggle and the one field beside it are one `auto | 1fr` row (see togglePairs), so the
  // toggle is never squeezed or overflows into the field. Below 48rem they stack.
  const drawable = shown.filter(f => !folded.has(f.name));
  const pairs = standardBody ? togglePairs(drawable) : new Map();
  // Compact: fields that read as one measurement (compactPairs.ts) are one row.
  const joins = layout === 'compact' && inSectionBody ? compactJoins(drawable) : new Map();
  const joinedRest = new Set<string>(
    [...joins].flatMap(([first, j]) =>
      j.fields.map((f: FormField) => f.name).filter((n: string) => n !== first),
    ),
  );
  const partnerOf = new Map<string, { field: FormField; toggleFirst: boolean }>();
  const partners = new Set<string>();
  pairs.forEach(({ second, toggleFirst }, first) => {
    partnerOf.set(drawable[first].name, { field: drawable[second], toggleFirst });
    partners.add(drawable[second].name);
  });
  const withoutSpan = (field: FormField): FormField => ({
    ...field,
    wrapperClassName: (field.wrapperClassName ?? '').replace(PAIR_SPAN, ' ').trim(),
    narrowSpan: undefined,
  });

  const renderField = (field: FormField, rowGroup: RowGroupRole, bare?: boolean) => (
    <FieldRenderer
      bare={bare}
      rowGroup={rowGroup}
      other={others.get(field.name)}
      folded={folded.has(field.name)}
      key={field.key ?? field.name}
      control={control}
      field={field}
      namePrefix={namePrefix}
      index={index}
      schema={schema as z.ZodObject<any> | undefined}
      globalShowCharCount={showCharCount}
      globalDisabled={disabled}
    />
  );

  // Consecutive toggle-first pairs share one grid, so its `auto` column is as wide as the widest
  // toggle among them and the fields beside them start at the same x.
  type Block =
    | { plain: FormField; role: RowGroupRole }
    | { joined: FormField[]; separator?: string }
    | { rows: [FormField, FormField][]; toggleFirst: boolean };
  const blocks: Block[] = [];
  let open: Extract<Block, { rows: unknown }> | null = null;
  shown.forEach(field => {
    const role = folded.has(field.name) ? undefined : roles[drawn++];
    if (partners.has(field.name) || joinedRest.has(field.name)) return; // drawn with its toggle / row
    const join = joins.get(field.name);
    if (join) {
      blocks.push({ joined: join.fields, separator: join.separator });
      open = null;
      return;
    }
    const pair = partnerOf.get(field.name);
    if (!pair) {
      blocks.push({ plain: field, role });
      if (!folded.has(field.name)) open = null;
      return;
    }
    const row: [FormField, FormField] = [field, pair.field];
    if (pair.toggleFirst && open) {
      open.rows.push(row);
      return;
    }
    const block = { rows: [row], toggleFirst: pair.toggleFirst };
    blocks.push(block);
    open = pair.toggleFirst ? block : null;
  });

  return (
    <>
      {blocks.map(block =>
        'joined' in block ? (
          <JoinedRow
            key={block.joined[0].key ?? block.joined[0].name}
            fields={block.joined}
            separator={block.separator}
            namePrefix={namePrefix}
            index={index}
          >
            {block.joined.map(f => renderField(f, undefined, true))}
          </JoinedRow>
        ) : 'plain' in block ? (
          renderField(block.plain, block.role)
        ) : (
          <div
            key={block.rows[0][0].key ?? block.rows[0][0].name}
            className={clsx(
              'col-span-12 grid items-start gap-x-10 gap-y-[1.2857rem] @max-[48rem]/form-shell:grid-cols-1',
              block.toggleFirst
                ? 'grid-cols-[auto_minmax(0,1fr)]'
                : 'grid-cols-[minmax(0,1fr)_auto]',
            )}
          >
            {block.rows.flatMap(row => row.map(f => renderField(withoutSpan(f), undefined)))}
          </div>
        ),
      )}
    </>
  );
}

/** Whether any of `fields` is required now: a joined row draws one `*`. */
function useAnyRequired(fields: FormField[], namePrefix: string, index?: number) {
  const watchFields = useMemo(
    () => [
      ...new Set(fields.flatMap(f => extractConditionFields(f.requiredWhen, namePrefix, index))),
    ],
    [fields, namePrefix, index],
  );
  const watched = useWatch({ name: watchFields });
  const values = useMemo(() => {
    const obj: Record<string, unknown> = {};
    watchFields.forEach((name, i) =>
      setNestedValue(obj, name, Array.isArray(watched) ? watched[i] : watched),
    );
    return obj;
  }, [watchFields, watched]);
  return fields.some(
    f =>
      f.required ||
      (f.requiredWhen && evaluateConditions(f.requiredWhen, values, namePrefix, index)),
  );
}

/**
 * Compact: the controls of a group of fields (`compactPairs.ts`) in one label-left pair, one label
 * and the controls side by side. The label is the fields' own labels joined; each control is still
 * named by its own label for assistive tech. It takes no row break from the Standard span runs
 * (`rowGroupRoles`): Compact decides its width itself (a half, or a whole row when narrow).
 */
function JoinedRow({
  fields,
  separator,
  namePrefix = '',
  index,
  children,
}: {
  fields: FormField[];
  separator?: string;
  namePrefix?: string;
  index?: number;
  children: ReactNode[];
}) {
  const labelId = useId();
  const pageReadOnly = useFormReadOnly();
  const required = useAnyRequired(fields, namePrefix, index);
  return (
    <FormFieldShell
      name={fullFieldName(fields[0].name, namePrefix, index)}
      label={fields.map(f => f.label).join(separator ? ` ${separator} ` : ' / ')}
      labelId={labelId}
      required={required}
      read={pageReadOnly}
      tall
      // Three controls need a wider half than two (about 96px each from 72rem of sheet)
      wide={fields.length > 2}
    >
      <div className="flex items-center gap-2">
        {children.flatMap((child, k) =>
          k > 0 && separator
            ? [
                <span key={`s${k}`} aria-hidden className="text-sm text-(--palette-ink-2)">
                  {separator}
                </span>,
                child,
              ]
            : [child],
        )}
      </div>
    </FormFieldShell>
  );
}

const isFlowGroup = (item: FormFieldItem): item is FlowGroup => (item as FlowGroup).type === 'flow';
const isBooleanChips = (item: FormFieldItem): item is BooleanChips =>
  (item as BooleanChips).type === 'boolean-chips';
const isLayoutItem = (item: FormFieldItem): item is FlowGroup | BooleanChips =>
  isFlowGroup(item) || isBooleanChips(item);

/** A boolean chip group (`booleanChips()`): the chips' booleans and caption, labelled like any field. */
function BooleanChipsView({
  group,
  namePrefix = '',
  index,
}: { group: BooleanChips } & Omit<FormFieldsProps, 'fields'>) {
  const relabel = useContext(FieldLabelContext);
  const label = relabel
    ? relabel({ type: 'text-input', name: group.name, label: group.label }).label
    : group.label;
  const chips = group.items.map(f => ({
    name: fullFieldName(f.name, namePrefix, index),
    label:
      (relabel ? relabel(f.chip?.labelKey ? { ...f, name: f.chip.labelKey } : f) : f).label ??
      f.name,
    chip: f.chip,
  }));
  return (
    <BooleanChipsField
      name={fullFieldName(group.name, namePrefix, index)}
      label={label ?? group.label}
      chips={chips}
    />
  );
}

/**
 * Renders field configs (see `PlainFields`). Flow groups and boolean chip groups among them split
 * the list: the fields between two of them are drawn as one list, a flow group as its toggle row
 * with its follow-ups, a chip group as its own row.
 */
export function FormFields(props: FormFieldsProps) {
  const { fields, ...rest } = props;
  if (!fields.some(isLayoutItem)) return <PlainFields fields={fields as FormField[]} {...rest} />;
  const parts: ReactNode[] = [];
  let chunk: FormField[] = [];
  const flush = () => {
    if (chunk.length) parts.push(<PlainFields key={`f${parts.length}`} fields={chunk} {...rest} />);
    chunk = [];
  };
  fields.forEach(item => {
    if (isLayoutItem(item)) {
      flush();
      parts.push(
        isFlowGroup(item) ? (
          <FlowGroupView key={`g${parts.length}`} group={item} {...rest} />
        ) : (
          <BooleanChipsView key={`c${parts.length}`} group={item} {...rest} />
        ),
      );
    } else chunk.push(item);
  });
  flush();
  return <>{parts}</>;
}

/** Whether any of `fields` shows now: the block under a toggle row is drawn only then. */
function useAnyVisible(fields: FormField[], namePrefix: string, index?: number) {
  const watchFields = useMemo(() => {
    const names: string[] = [];
    for (const f of fields) {
      names.push(...extractConditionFields(f.showWhen, namePrefix, index));
      names.push(...extractConditionFields(f.hideWhen, namePrefix, index));
    }
    return [...new Set(names)];
  }, [fields, namePrefix, index]);
  const watched = useWatch({ name: watchFields });
  const values = useMemo(() => {
    const obj: Record<string, unknown> = {};
    watchFields.forEach((name, i) =>
      setNestedValue(obj, name, Array.isArray(watched) ? watched[i] : watched),
    );
    return obj;
  }, [watchFields, watched]);
  return fields.some(f => {
    if (f.hide) return false;
    let visible = true;
    if (f.showWhen) visible = evaluateConditions(f.showWhen, values, namePrefix, index);
    else if (f.hideWhen) visible = !evaluateConditions(f.hideWhen, values, namePrefix, index);
    return visible;
  });
}

/**
 * A row of yes/no toggles at their own width (`flex-wrap`), and under it the fields they open in a
 * plain rows, drawn only while one of them shows. Compact keeps its label/value pairs: the same
 * fields in the same order.
 */
function FlowGroupView({
  group,
  namePrefix = '',
  index,
  ...rest
}: { group: FlowGroup } & Omit<FormFieldsProps, 'fields'>) {
  const layout = useFormLayout();
  const inSectionBody = useContext(FormSectionBodyContext);
  const standard = layout === 'standard' && inSectionBody;
  const contextSchema = useFormSchema();
  // A chip group's "other" text is drawn in its chip, and only when both are in one list: a
  // companion listed under the row joins the row's list (where it draws nothing), not the block.
  const { folded } = pairOthers(
    [...group.row, ...group.follow],
    (rest.schema ?? contextSchema ?? undefined) as FieldSchema,
    namePrefix,
    index,
  );
  const rowFields = [...group.row, ...group.follow.filter(f => folded.has(f.name))];
  const followFields = group.follow.filter(f => !folded.has(f.name));
  const anyFollow = useAnyVisible(followFields, namePrefix, index);

  if (!standard)
    return (
      <PlainFields
        fields={[...group.row, ...group.follow]}
        namePrefix={namePrefix}
        index={index}
        {...rest}
      />
    );

  const inRow = rowFields.map(f => ({
    ...f,
    wrapperClassName: clsx(
      (f.wrapperClassName ?? '').replace(PAIR_SPAN, ' ').trim(),
      group.rowWidths?.[f.name],
    ),
    narrowSpan: undefined,
  }));
  const inBlock = asRemarks(followFields);
  return (
    // The row and what it opens are spaced like any two rows of the section.
    <div className="col-span-12 grid gap-y-[1.2857rem]">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
        <PlainFields fields={inRow} namePrefix={namePrefix} index={index} {...rest} />
      </div>
      {/* Always mounted: a hidden field clears itself on the change, and an unmounted one cannot. */}
      <div
        data-flow-follow={anyFollow ? '' : undefined}
        className={clsx(
          'grid grid-cols-12 gap-x-[1.1429rem] gap-y-[1.2857rem]',
          !anyFollow && 'hidden',
          // The section body's quarter/third fallback, for the narrow fields under the row.
          '@max-[56rem]/form-shell:[&>.col-span-3]:col-span-6 @max-[56rem]/form-shell:[&>.col-span-4]:col-span-6',
        )}
      >
        <PlainFields fields={inBlock} namePrefix={namePrefix} index={index} {...rest} />
      </div>
    </div>
  );
}

/** A long remark (the 4,000-character ones) opens four lines tall, so a paragraph shows without scrolling inside the box. */
const asRemarks = (fields: FormField[]) =>
  fields.map(f =>
    f.type === 'textarea' && f.rows === undefined && (f.maxLength ?? 4000) >= 1000
      ? { ...f, rows: 4 }
      : f,
  );

/** A `col-span-*` (or start/end) class, at any breakpoint: a pair's own grid decides the widths. */
const PAIR_SPAN = /(?:^|\s)(?:[\w-]+:)*col-(?:span|start|end)-\S+/g;

/** Compact keeps these on a pair of their own: textareas and multi-input rows. */
const FULL_PAIR_TYPES = new Set<FormField['type']>(['textarea', 'location-selector']);

/**
 * Types whose label FormFields draws (in `FormFieldShell`). A single control is labelled by
 * `htmlFor`; a group of controls (chips, toggle, dropdown, the several inputs of an address) is
 * named by `aria-labelledby` on a wrapper. A checkbox and a switch carry their label inline and keep it.
 */
const LABEL_FOR_TYPES = new Set<FormField['type']>([
  'text-input',
  'number-input',
  'date-input',
  'datetime-input',
  'textarea',
  'parameter-search',
]);
const LABELLED_BY_TYPES = new Set<FormField['type']>([
  'boolean-toggle',
  'string-toggle',
  'checkbox-group',
  'radio-group',
  'location-selector',
  'appraisal-selector',
  // Not `aria-label` on the trigger: that would replace its name, which carries the selected value.
  'dropdown',
  'select-input',
]);
const drawsLabel = (type: FormField['type']) =>
  LABEL_FOR_TYPES.has(type) || LABELLED_BY_TYPES.has(type);

/**
 * Internal component that renders individual fields
 */
function FieldRenderer({
  control,
  field,
  namePrefix = '',
  index,
  schema,
  globalShowCharCount,
  globalDisabled,
  rowGroup,
  other,
  folded,
  bare,
}: FieldRendererProps) {
  // Check visibility, disabled, and required state
  const {
    isVisible,
    isDisabled: fieldDisabled,
    isRequired,
  } = useFieldState({ field, namePrefix, index });
  const isDisabled = fieldDisabled || (globalDisabled ?? false);
  const pageReadOnly = useFormReadOnly();
  const { t: tUnit } = useTranslation('common');
  const { setValue, getValues, watch } = useFormContext();
  const uid = useId();
  const controlId = `${uid}-control`;
  const labelId = `${uid}-label`;

  const choice = field.type === 'radio-group' || field.type === 'checkbox-group' ? field : null;
  // A chip, checkbox or radio group takes a row of its own, unless the form keeps its span
  // (`keepSpan`: the house number and its status chips stay side by side).
  const choiceGroup = !!choice && !choice.keepSpan;

  const filterWatchValues = useFilterWatchValues(
    field.type === 'dropdown' ? (field as any).filterOptions : undefined,
  );

  // Build a full field name with prefix and index
  const name = fullFieldName(field.name, namePrefix, index);

  // Clamp a disabled field to its `disabledValue`. Subscribing to the field's own value
  // (via useWatch) means this also re-fires when the value is re-seeded while already
  // disabled — e.g. a parent reset()/async load populating the form after mount, which a
  // one-shot "on became disabled" effect would miss.
  //
  // Keyed on the field's OWN rule, never on `globalDisabled`: a read-only page disables every
  // field, and a page that is read-only only until its menu tree loads would otherwise rewrite
  // values on a form nobody is allowed to edit.
  const watchedValue = useWatch({ control, name });
  // What the field held just before it was clamped, so a toggle flipped by mistake can be undone.
  const preClampRef = useRef<unknown>(undefined);
  const wasFieldDisabledRef = useRef<boolean | null>(null);
  const lastSeenValueRef = useRef<unknown>(undefined);
  useEffect(() => {
    const wasDisabled = wasFieldDisabledRef.current;
    const lastSeenValue = lastSeenValueRef.current;
    wasFieldDisabledRef.current = fieldDisabled;
    const current = getValues(name);
    lastSeenValueRef.current = current;

    if (!fieldDisabled) return;
    if (field.disabledValue === undefined) return;
    if (current === field.disabledValue) return;

    // A blank always takes the stand-in: there is nothing to lose and the field should read
    // "not applicable" rather than sit empty.
    const isEmpty = current === null || current === undefined || current === '';
    if (isEmpty) {
      // Not dirty: filling a blank as a record opens is presentation, and marking it would arm
      // the unsaved-changes prompt on a form nobody has touched.
      setValue(name, field.disabledValue, { shouldDirty: false, shouldValidate: true });
      return;
    }

    // Overwriting text takes more than the field being disabled — it takes the appraiser having
    // just said so. Two other things reach this line and must not destroy stored data:
    //   • mount (wasDisabled === null), and
    //   • reset() landing a record — every page seeds module defaults and applies the record in
    //     an effect, so the governing field flips to "disabled" and this field's value arrives in
    //     the SAME commit. A user flipping a toggle changes only the governing field, so the two
    //     are told apart by whether this field's own value moved at the same time.
    // Getting this wrong destroys data silently: the clamped '' is posted on the next save and
    // the API reads '' as "clear this".
    const userFlippedTheRule = wasDisabled === false && current === lastSeenValue;
    if (!userFlippedTheRule) return;

    preClampRef.current = current;
    // Dirty, unlike the blank-filling case above: the appraiser's own action changed a stored
    // value, and that change must show as an edit (unsaved-changes guard, the Data Correction
    // confirm dialog). A quiet clamp once cleared the number on screen but left it in the
    // database, so the report kept printing a registration number under the
    // "ยังไม่ได้รับการจดทะเบียน" heading.
    setValue(name, field.disabledValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [fieldDisabled, watchedValue, name, field.disabledValue, getValues, setValue]);

  // …and let it go again when the field becomes editable. `disabledValue` is a stand-in for "not
  // applicable" — "ไม่สามารถตรวจสอบกรรมสิทธิ์ได้", "-", 0 — not data the appraiser meant to enter,
  // so leaving it behind made them delete it by hand before they could type. Opt out with
  // `clearOnEnable: false` where the stand-in is a legitimate resting value, as on a toggle.
  const prevDisabledRef = useRef<boolean | null>(null);
  useEffect(() => {
    const wasDisabled = prevDisabledRef.current;
    prevDisabledRef.current = fieldDisabled;

    // The field's own rule again, not `globalDisabled` — a page leaving read-only is not the
    // appraiser saying this field now applies.
    // Only on a real disabled → enabled transition. Never on mount: a saved record whose value
    // genuinely equals the stand-in must survive being opened.
    if (fieldDisabled || wasDisabled !== true) return;
    if (field.disabledValue === undefined || field.clearOnEnable === false) return;

    // Release it to the empty value the control itself understands. A text input handed `null`
    // flips from controlled to uncontrolled: React stops managing it and the DOM keeps showing
    // the stand-in, which is exactly the bug this effect was written to fix. An empty string is
    // still a controlled value. Non-string stand-ins (a number, a date) have no such literal, so
    // they fall back to null.
    // Give back what was clamped away, if anything: a saved description survives its toggle
    // being flipped to No and back, instead of being destroyed by a stray click and then saved
    // as an empty string. An explicit `enabledValue` still wins — it names a resting value the
    // field must land on, not the appraiser's own text.
    const restored =
      field.enabledValue !== undefined
        ? field.enabledValue
        : preClampRef.current !== undefined
          ? preClampRef.current
          : typeof field.disabledValue === 'string'
            ? ''
            : null;
    if (getValues(name) === field.disabledValue && getValues(name) !== restored) {
      // Dirty on purpose: the stored value really does change, so the form must offer to save it.
      setValue(name, restored, { shouldDirty: true, shouldValidate: false });
      preClampRef.current = undefined;
    }
  }, [
    fieldDisabled,
    name,
    field.disabledValue,
    field.clearOnEnable,
    field.enabledValue,
    getValues,
    setValue,
  ]);

  // Fill this field when the appraiser picks a value of `defaultWhen.field`. RHF tells a user's
  // change (`type: 'change'`, from the control's onChange) from a reset or a setValue (no type), so
  // opening a record, which resets, never overwrites what it holds.
  const defaultWhen = field.defaultWhen;
  const defaultSource = defaultWhen && fullFieldName(defaultWhen.field, namePrefix, index);
  useEffect(() => {
    if (!defaultWhen || !defaultSource) return;
    const subscription = watch((values, info) => {
      if (info.type !== 'change' || info.name !== defaultSource) return;
      const picked = getNestedValue(values, defaultSource);
      const hit = defaultWhen.cases.find(c => c.is === picked);
      // After the change has finished emitting: set from inside it, the box kept showing the old
      // figure until the next render.
      if (hit)
        queueMicrotask(() =>
          setValue(name, hit.value, { shouldDirty: true, shouldValidate: true }),
        );
    });
    return () => subscription.unsubscribe();
  }, [defaultWhen, defaultSource, name, watch, setValue]);

  // Clear field value when hidden by showWhen/hideWhen (clearOnHide defaults to true)
  const prevVisibleRef = useRef<boolean | null>(null);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = isVisible;

    // Only clear on a genuine visible → hidden transition.
    // Skip if: initial mount (null), still hidden (false→false), or became visible.
    // This prevents clearing during form init and reset() propagation delays.
    if (!isVisible && wasVisible === true) {
      if (field.clearOnHide === false) return;

      const clearValue = field.hiddenValue ?? null;
      const currentValue = getValues(name);
      if (currentValue !== clearValue) {
        setValue(name, clearValue, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
  }, [isVisible, name, field.clearOnHide, field.hiddenValue, getValues, setValue]);

  const {
    field: fieldProps,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  // The text of a chip group's "other" option, for a read page.
  const otherText = useWatch({ control, name: other?.name ?? name });

  // Don't render if field is not visible, or if its chip group draws it
  if (!isVisible || folded) {
    return null;
  }

  // Extract constraints from schema if available
  const schemaConstraints = schema ? getFieldConstraints(schema, name) : {};
  const schemaProps = constraintsToInputProps(schemaConstraints);

  // Exclude wrapperClassName, condition props, and schema-builder-only props from being passed to components
  const {
    wrapperClassName: _w,
    keepSpan: _ks,
    narrowSpan: _ns,
    showWhen: _sw,
    hideWhen: _hw,
    disableWhen: _dw,
    enableWhen: _ew,
    requiredWhen: _rw,
    disabled: _d,
    required: _r,
    disabledValue: _dv,
    clearOnEnable: _coe,
    enabledValue: _ev,
    clearOnHide: _coh,
    defaultWhen: _dfw,
    hiddenValue: _hv,
    formatPattern: _fp,
    formatPatternMessage: _fpm,
    help: _help,
    hint,
    disabledHint,
    inputMask,
    placeholder: fieldPlaceholder,
    ...passedField
  } = field;

  // The wrapper draws the label (and the "?" beside it), so no input below gets `label` or
  // `labelAddon`; a checkbox or switch keeps its inline label.
  // A read page draws a checkbox's or switch's label too: the value beside it is just its state.
  const read = pageReadOnly && READ_TYPES.has(passedField.type);
  const labelText =
    drawsLabel(passedField.type) ||
    (read && (passedField.type === 'checkbox' || passedField.type === 'switch'))
      ? field.label
      : undefined;
  const labelAddon = field.help ? (
    <FieldHelp config={field.help} namePrefix={namePrefix} index={index} />
  ) : undefined;

  // The helper line under the control; while the field's own rule locks it, the lock's reason.
  const locked = fieldDisabled && !!disabledHint;
  const helperLine = locked ? disabledHint : hint;

  // Render the appropriate field component
  const renderFieldComponent = () => {
    switch (passedField.type) {
      case 'text-input': {
        // Merge schema constraints with field overrides (field overrides take precedence)
        const textProps = {
          ...schemaProps,
          maxLength: passedField.maxLength ?? schemaProps.maxLength,
          minLength: passedField.minLength ?? schemaProps.minLength,
          required: isRequired,
          showCharCount: passedField.showCharCount ?? globalShowCharCount,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return (
          <TextInput
            {...fieldProps}
            {...passedField}
            {...textProps}
            id={controlId}
            label={undefined}
            {...(bare && { 'aria-label': field.label })}
            inputMask={inputMask}
            error={error?.message}
          />
        );
      }

      case 'number-input': {
        const numberProps = {
          ...schemaProps,
          min: passedField.min ?? schemaProps.min,
          max: passedField.max ?? schemaProps.max,
          required: isRequired,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
          // A unit key ('m', 'sqm', 'baht'): the unit in the user's language, or the text as given.
          ...(passedField.suffix && {
            suffix: tUnit(`units.${passedField.suffix}` as never, {
              defaultValue: passedField.suffix,
            }) as string,
          }),
        };
        return (
          <NumberInput
            {...fieldProps}
            {...passedField}
            {...numberProps}
            id={controlId}
            label={undefined}
            {...(bare && { 'aria-label': field.label })}
            error={error?.message}
          />
        );
      }

      case 'date-input': {
        const dateProps = {
          required: isRequired,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return (
          <DateInput
            {...fieldProps}
            {...passedField}
            {...dateProps}
            id={controlId}
            label={undefined}
            error={error?.message}
          />
        );
      }

      case 'datetime-input': {
        const dateTimeProps = {
          required: isRequired,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return (
          <DateTimeInput
            {...fieldProps}
            {...passedField}
            {...dateTimeProps}
            id={controlId}
            label={undefined}
            error={error?.message}
          />
        );
      }

      case 'select-input': {
        const selectProps = {
          required: isRequired,
          disabled: isDisabled,
        };
        return (
          <SelectInput
            {...fieldProps}
            {...passedField}
            {...selectProps}
            label={undefined}
            error={error?.message}
          />
        );
      }

      case 'dropdown': {
        const dropdownProps = {
          required: isRequired,
          disabled: isDisabled,
        };
        return (
          <Dropdown
            {...fieldProps}
            {...passedField}
            {...dropdownProps}
            label={undefined}
            error={error?.message}
            filterWatchValues={filterWatchValues}
          />
        );
      }

      case 'boolean-toggle': {
        const { type: _bt, name: _bn, key: _bk, ...boolToggleRest } = passedField;
        return (
          <FormBooleanToggle
            {...boolToggleRest}
            name={name}
            disabled={isDisabled}
            locked={locked}
            label={undefined}
          />
        );
      }

      case 'string-toggle': {
        const { type: _st, name: _sn, key: _sk, ...strToggleRest } = passedField;
        return (
          <FormStringToggle
            {...strToggleRest}
            name={name}
            disabled={isDisabled}
            label={undefined}
          />
        );
      }

      case 'textarea': {
        const textareaProps = {
          ...schemaProps,
          maxLength: passedField.maxLength ?? schemaProps.maxLength,
          required: isRequired,
          showCharCount: passedField.showCharCount ?? globalShowCharCount,
          disabled: isDisabled,
          ...(fieldPlaceholder && { placeholder: fieldPlaceholder }),
        };
        return (
          <Textarea
            {...fieldProps}
            {...passedField}
            {...textareaProps}
            id={controlId}
            label={undefined}
            error={error?.message}
          />
        );
      }

      case 'checkbox':
        return (
          <FormCheckbox
            name={name}
            label={passedField.label}
            description={passedField.description}
            disabled={isDisabled}
            className={passedField.className}
            size={passedField.size}
          />
        );

      case 'checkbox-group': {
        const {
          type: _cgt,
          name: _cgn,
          key: _cgk,
          className: cgClass,
          wrap: cgWrap,
          size: cgSize,
          orientation: _cgOri,
          variant: cgVariant,
          ...cgGroupOrOptions
        } = passedField;
        return (
          <FormCheckboxGroup
            name={name}
            disabled={isDisabled}
            className={cgClass}
            wrap={cgWrap}
            size={cgSize}
            variant={cgVariant}
            other={other}
            {...cgGroupOrOptions}
            label={undefined}
          />
        );
      }

      case 'radio-group': {
        const {
          type: _rgt,
          name: _rgn,
          key: _rgk,
          className: rgClass,
          size: rgSize,
          orientation: rgOri,
          variant: rgVariant,
          ...rgGroupOrOptions
        } = passedField;
        return (
          <FormRadioGroup
            name={name}
            disabled={isDisabled}
            className={rgClass}
            size={rgSize}
            orientation={rgOri}
            variant={rgVariant}
            other={other}
            {...rgGroupOrOptions}
            label={undefined}
          />
        );
      }

      case 'switch':
        return (
          <FormSwitch
            name={name}
            label={passedField.label}
            description={passedField.description}
            disabled={isDisabled}
            className={passedField.className}
            size={passedField.size}
            labelPosition={passedField.labelPosition}
          />
        );

      case 'appraisal-selector':
        return (
          <AppraisalSelector
            name={name}
            placeholder={fieldPlaceholder}
            idField={passedField.idField}
            valueField={passedField.valueField}
            dateField={passedField.dateField}
            disabled={isDisabled}
            required={isRequired}
            error={error?.message}
            className={passedField.className}
          />
        );

      case 'location-selector': {
        // Helper to prefix a field path - ONLY when index is defined (array context)
        // Non-array usage (like AddressForm) uses absolute paths that don't need prefixing
        const prefixFieldPath = (fieldPath: string | undefined): string | undefined => {
          if (!fieldPath) return undefined;

          // Only prefix in array context (when index is defined)
          if (index === undefined) {
            return fieldPath; // Return as-is for non-array usage
          }

          let prefixedPath = `${index}.${fieldPath}`;
          if (namePrefix !== undefined && namePrefix.trim() !== '') {
            prefixedPath = `${namePrefix}.${prefixedPath}`;
          }
          return prefixedPath;
        };

        const locationProps = {
          required: isRequired,
          disabled: isDisabled,
        };
        return (
          <LocationSelector
            name={name}
            placeholder={fieldPlaceholder}
            districtField={prefixFieldPath(passedField.districtField) ?? ''}
            districtNameField={prefixFieldPath(passedField.districtNameField)}
            provinceField={prefixFieldPath(passedField.provinceField) ?? ''}
            provinceNameField={prefixFieldPath(passedField.provinceNameField)}
            postcodeField={prefixFieldPath(passedField.postcodeField) ?? ''}
            subDistrictNameField={prefixFieldPath(passedField.subDistrictNameField)}
            addressSource={passedField.addressSource}
            resolveFromAnySource={passedField.resolveFromAnySource}
            error={error?.message}
            className={passedField.className}
            {...locationProps}
          />
        );
      }
      case 'parameter-search': {
        return (
          <ParameterSearchInput
            {...fieldProps}
            group={(passedField as any).group ?? ''}
            options={(passedField as any).options}
            id={controlId}
            {...{ required: isRequired, disabled: isDisabled }}
            error={error?.message}
          />
        );
      }

      case 'field-array':
        return null; // Schema-only — array rendering handled by useFieldArray + namePrefix
    }
  };

  // A read page shows label and value, not disabled controls (DESIGN.md 17.3). A field that is only
  // disabled on an editable page keeps its control.
  // data-field is how scrollToField locates this field: a [name=...] selector cannot be used
  // because Dropdown never forwards `name` to the DOM.
  const content = (
    <>
      {read ? (
        <FormReadValue
          field={field}
          name={name}
          value={fieldProps.value}
          required={isRequired}
          other={other && { is: other.is, text: otherText }}
        />
      ) : (
        renderFieldComponent()
      )}
      {!read &&
        helperLine &&
        (locked ? (
          // Why it is locked: the accent line with a lock, not the grey helper.
          <p className="mt-1 flex items-start gap-1.5 text-xs text-(--palette-accent-ink)">
            <Icon name="lock" style="solid" className="mt-0.5 shrink-0" />
            {helperLine}
          </p>
        ) : (
          <p className={`mt-1 ${HELPER_TEXT}`}>{helperLine}</p>
        ))}
    </>
  );
  // A joined row's control: the row's shell draws the label; the `data-field` is what a form
  // error on this field scrolls to.
  if (bare)
    return (
      <div data-field={name} className="min-w-0 flex-1">
        <ValidationLabelContext.Provider value={field.label}>
          {content}
        </ValidationLabelContext.Provider>
      </div>
    );
  return (
    <FormFieldShell
      name={name}
      label={labelText}
      labelFor={!read && LABEL_FOR_TYPES.has(passedField.type) ? controlId : undefined}
      labelId={!read && LABELLED_BY_TYPES.has(passedField.type) ? labelId : undefined}
      required={isRequired}
      addon={labelAddon}
      wrapperClassName={field.wrapperClassName}
      full={
        FULL_PAIR_TYPES.has(passedField.type) || choiceGroup || COMPACT_FULL_ROW.has(field.name)
      }
      tall={FULL_PAIR_TYPES.has(passedField.type) || !!choice}
      rowGroup={rowGroup}
      chips={isChipGroup(field)}
      narrowSpan={field.narrowSpan}
      read={read}
    >
      {content}
    </FormFieldShell>
  );
}

// Re-export types for convenience
export type { FormField } from './types';
