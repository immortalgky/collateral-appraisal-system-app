import Button from '@/shared/components/Button';
import { buildFormSchema, type FormField, FormFields } from '@/shared/components/form';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FormProvider, useForm } from 'react-hook-form';

import { landtitlesFields } from '@features/appraisal/configs/fields.ts';
import { zodResolver } from '@hookform/resolvers/zod';

interface LandTitleModalProps {
  fields: FormField[];
  defaultValues?: Record<string, any>;
  onCancel: () => void;
  onSave: (data: Record<string, any>) => void;
  readOnly?: boolean;
}

const createLandTitleForm = buildFormSchema(landtitlesFields);

const LandTitleModal = ({
  fields,
  defaultValues,
  onCancel,
  onSave,
  readOnly = false,
}: LandTitleModalProps) => {
  // Escape closes, the way every other dialog in the app does. Bound on the document rather
  // than the panel so it works before anything inside has been focused.
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

  // Clicking the backdrop closes, but only when the press started there too. Without the
  // mousedown check, selecting text inside a field and releasing outside the panel would count
  // as an outside click and throw the edit away.
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
    resolver: zodResolver(createLandTitleForm),
    defaultValues: defaultValues ?? {},
  });

  useEffect(() => {
    form.reset(defaultValues ?? {});
  }, [defaultValues, form]);

  const { watch, setValue } = form;
  const pricePerSqWa = watch('governmentPricePerSqWa');
  const rai = watch('rai');
  const ngan = watch('ngan');
  const squareWa = watch('squareWa');

  useEffect(() => {
    const price = Number(pricePerSqWa) || 0;
    const totalWa = (Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(squareWa) || 0);
    setValue('totalSquareWa', totalWa);
    setValue('governmentPrice', Math.round(price * totalWa * 100) / 100);
  }, [pricePerSqWa, rai, ngan, squareWa, setValue]);

  // Area fields default to 0 when left blank, so they persist as 0 rather than null
  // (keeps Total Sq.Wa / government price math and the summary totals clean).
  const handleSave = form.handleSubmit(data =>
    onSave({
      ...data,
      rai: data.rai ?? 0,
      ngan: data.ngan ?? 0,
      squareWa: data.squareWa ?? 0,
    })
  );

  // Rendered into <body>. `position: fixed` is only viewport-relative while no ancestor
  // establishes a containing block, and this dialog sits deep inside the form — under an
  // `overflow-hidden` wrapper and a scroll container. A portal makes that irrelevant instead
  // of leaving the dialog's position at the mercy of its ancestors, and it also lifts the
  // dialog out of `.cas-form-grid` so the grid layout's field rules never reach inside it.
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
          aria-label="Title Detail"
          className="flex max-h-full w-3/5 flex-col rounded-2xl bg-white shadow-2xl"
        >
          <div className="px-8 pt-8 pb-4 shrink-0">
            <h2 className="text-lg font-semibold">Title Detail</h2>
            <div className="h-px bg-gray-200 mt-4"></div>
          </div>

          {/* cas-form-grid opts the dialog into the grid layout too. It portals into <body>, so
              it is not inside the page's own `.cas-form-grid` and had to say so itself —
              otherwise the one screen that edits a title deed looked nothing like the screen
              behind it. Inert for anyone on the classic layout, as everywhere else. */}
          <div className="cas-form-grid flex-1 overflow-y-auto px-8 py-2">
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
