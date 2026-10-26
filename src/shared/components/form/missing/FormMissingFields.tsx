import { useEffect, useRef, type ReactNode } from 'react';
import { useFormState } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';
import type { FormField } from '../types';
import { MissingFieldsProvider } from './MissingFieldsProvider';
import { useMissingFields } from './missingFieldsContext';
import { useFormMissingFields } from './useFormMissingFields';

/** Opens the popover when a Save fails validation: the submit count went up and errors came out. */
function OpenOnFailedSubmit() {
  const show = useMissingFields()?.show;
  const { submitCount, errors } = useFormState();
  const hasErrors = Object.keys(errors).length > 0;
  const seen = useRef(submitCount);

  useEffect(() => {
    if (submitCount === seen.current) return;
    seen.current = submitCount;
    if (hasErrors) show?.();
  }, [submitCount, hasErrors, show]);

  return null;
}

/**
 * What `FormProvider` wraps every form in: computes what the form is missing and shares it with
 * the chip in the `ActionBar`. Must sit inside the RHF provider. Kept apart from
 * `FormProvider` so only this small tree re-renders when the summary or the submit state changes.
 */
export function FormMissingFields({
  schema,
  fields,
  renderedOnly,
  children,
}: {
  schema: ZodTypeAny;
  fields?: FormField[];
  renderedOnly?: boolean;
  children: ReactNode;
}) {
  const { summary, refresh } = useFormMissingFields({ schema, fields, renderedOnly });
  return (
    <MissingFieldsProvider summary={summary} refresh={refresh}>
      <OpenOnFailedSubmit />
      {children}
    </MissingFieldsProvider>
  );
}
