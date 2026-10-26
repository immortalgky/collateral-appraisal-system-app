import type { FormEventHandler, ReactNode } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import { FormShell } from '@/features/appraisal/components/FormShell';
import type { FormShellPhotos } from '@/features/appraisal/components/FormShellBody';
import { FormLayoutProvider, FormProvider } from '@/shared/components/form';

interface CondoDetailShellProps<TFieldValues extends FieldValues> {
  methods: UseFormReturn<TFieldValues>;
  schema: z.ZodType<TFieldValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /**
   * Draws the record's photo section, given the `renderGallery` to hand to it. The shell mounts it
   * once and the section draws the photo card or the strip through it.
   */
  photos: FormShellPhotos;
  /** Inside the form: the ActionBar and the dialogs. */
  footer: ReactNode;
  /** The `FormSheet`. */
  children: ReactNode;
}

/**
 * The page shell of a Condo tower or model detail page. It owns the form element and the scroller;
 * the page keeps all the data, saving and dialogs. No header (the breadcrumb names the record and
 * leads back). The body is the property pages' (`FormShellBody`): the sheet with the photo card and
 * section TOC in a rail beside it when wide, the photo strip as the sheet's first section when
 * narrow. Block pages are always the Standard layout, whatever the user's setting.
 */
export function CondoDetailShell<TFieldValues extends FieldValues>({
  methods,
  schema,
  onSubmit,
  photos,
  footer,
  children,
}: CondoDetailShellProps<TFieldValues>) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <FormLayoutProvider layout="standard">
        <FormProvider methods={methods} schema={schema}>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* Nothing is pinned above the form (no tab row): sections scroll to the top edge. */}
            <FormShell photos={photos} bodyClassName="pb-4">
              {children}
            </FormShell>
            {footer}
          </form>
        </FormProvider>
      </FormLayoutProvider>
    </div>
  );
}
