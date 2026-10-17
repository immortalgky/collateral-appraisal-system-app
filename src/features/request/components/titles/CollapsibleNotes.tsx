import { useId, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormFields, type TextareaField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';

/**
 * The title's free-text detail (`notes`) under a label that folds it away. It opens at mount when
 * there is text (blank or whitespace-only counts as none) and is closed otherwise; that is decided
 * once, so clearing the text while typing does not fold the box under the user's hands. Read-only
 * follows the same rule, and the label still opens and closes it.
 */
export function CollapsibleNotes({ index, field }: { index: number; field: TextareaField }) {
  const { getValues } = useFormContext();
  const [open, setOpen] = useState(() => {
    const notes = getValues(`titles.${index}.notes`) as string | null | undefined;
    return !!notes?.trim();
  });
  const panelId = useId();

  return (
    <div className="col-span-6 flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(value => !value)}
        className="flex w-fit items-center gap-1 rounded-sm text-xs font-medium text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {field.label}
        <Icon name={open ? 'chevron-down' : 'chevron-right'} style="solid" className="size-2.5" />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col">
          {/* The label above is the visible one: no second label here, but the box keeps the name */}
          <FormFields
            fields={[
              {
                ...field,
                label: '',
                showCharCount: true,
                'aria-label': field.label,
              } as TextareaField,
            ]}
            namePrefix="titles"
            index={index}
          />
        </div>
      )}
    </div>
  );
}
