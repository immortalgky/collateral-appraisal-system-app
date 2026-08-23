import Button from '@/shared/components/Button';
import { buildFormSchema, type FormField, FormFields } from '@/shared/components/form';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

interface LandTitleModalProps {
  fields: FormField[];
  defaultValues?: Record<string, any>;
  onCancel: () => void;
  onSave: (data: Record<string, any>) => void;
  readOnly?: boolean;
}

const LandTitleModal = ({
  fields,
  defaultValues,
  onCancel,
  onSave,
  readOnly = false,
}: LandTitleModalProps) => {
  // Built from the `fields` prop, not from a module-level constant. The shared version validates
  // the full landtitlesFields list regardless of what it renders, which on a screen that shows a
  // subset means Save fails on inputs that are not on the page — silently, since there is nowhere
  // to put the error.
  const schema = useMemo(() => buildFormSchema(fields), [fields]);

  // Escape closes, the way every other dialog in the app does. Bound on the document
  // rather than the panel so it works before anything inside has been focused.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  // Clicking the backdrop closes, but only when the press started there too. Without
  // the mousedown check, selecting text inside a field and releasing outside the panel
  // would count as an outside click and throw the edit away.
  const pressedBackdrop = useRef(false);
  const onBackdropMouseDown = useCallback((event: React.MouseEvent) => {
    pressedBackdrop.current = event.target === event.currentTarget;
  }, []);
  const onBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (pressedBackdrop.current && event.target === event.currentTarget) onCancel();
      pressedBackdrop.current = false;
    },
    [onCancel],
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  useEffect(() => {
    form.reset(defaultValues ?? {});
  }, [defaultValues, form]);

  // The create screen recomputes totalSquareWa and governmentPrice from rai/ngan/squareWa on
  // mount. All three are gone from this screen's config, so there is nothing to compute from —
  // and computing anyway would overwrite the stored figures with zeroes.
  //
  // It also coerced blank rai/ngan/squareWa to 0 on every save. That mattered here: useFieldArray
  // recomputes dirty state by deep-diffing against the defaults with no shouldDirty to opt out,
  // so null → 0 marked three invisible fields as edited and put them on the wire.

  // Spread defaultValues back underneath: zod's object schema strips keys it does not declare,
  // and the row's `id` is not a field config, so a parsed row comes back without it. Losing the
  // id makes the row unmatchable — `toCorrectionRequest` drops it and the correction is saved as
  // nothing at all, with a success toast.
  const handleSave = form.handleSubmit(data => onSave({ ...defaultValues, ...data }));

  // Rendered into <body>. `position: fixed` is only viewport-relative while no
  // ancestor establishes a containing block, and this dialog sits deep inside the
  // form — under a `overflow-hidden` wrapper, a scroll container and a grid whose
  // rules the dialog explicitly opts out of. A portal makes that irrelevant
  // instead of leaving the dialog's position at the mercy of its ancestors.
  return createPortal(
    <FormProvider {...form}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8"
        role="presentation"
        onMouseDown={onBackdropMouseDown}
        onClick={onBackdropClick}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Land Detail"
          className="flex max-h-full w-3/5 flex-col rounded-2xl bg-white shadow-2xl"
        >
          <div className="px-8 pt-8 pb-4 shrink-0">
            <h2 className="text-lg font-semibold">Land Detail</h2>
            <div className="h-px bg-gray-200 mt-4"></div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-2">
            <div className="grid grid-cols-12 gap-4">
              <FormFields fields={fields} />
            </div>
          </div>

          <div className="px-8 pb-8 pt-4 flex justify-end gap-3 shrink-0 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancel
            </Button>
            {!readOnly && (
              <Button variant="primary" type="button" onClick={handleSave}>
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>,
    document.body,
  );
};

export default LandTitleModal;
