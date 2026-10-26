import { createContext, useContext, useMemo, type ReactNode, type Ref } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ZodTypeAny } from 'zod';
import {
  MissingFieldsProvider as ChipProvider,
  type MissingFieldsHandle,
} from '@/shared/components/form/missing';
import {
  toChipSummary,
  useRequestMissingFields,
  type MissingSummary,
} from '../../hooks/useRequestMissingFields';

export type { MissingFieldsHandle };

// The Request-shaped summary, which the section nav reads (counts, per-card totals). The chip takes
// the generic shape, derived from it below.
const RequestMissingContext = createContext<MissingSummary | null>(null);

/** null until the first parse of the form has run */
export const useRequestMissing = () => useContext(RequestMissingContext);

/**
 * Computes the missing fields once and shares them with the nav and the action bar's chip, so the
 * page itself does not re-render when the result changes. Must sit inside the FormProvider.
 */
export function MissingFieldsProvider({
  schema,
  handleRef,
  children,
}: {
  schema: ZodTypeAny;
  handleRef: Ref<MissingFieldsHandle>;
  children: ReactNode;
}) {
  const { t } = useTranslation('request');
  const methods = useFormContext();
  const { summary, refresh } = useRequestMissingFields(methods, schema);

  const chipSummary = useMemo(
    () => (summary ? toChipSummary(summary, section => t(`page.nav.${section}`)) : null),
    [summary, t],
  );

  return (
    <RequestMissingContext.Provider value={summary}>
      <ChipProvider
        summary={chipSummary}
        refresh={refresh}
        handleRef={handleRef}
        // Request's pill says it is ready to submit, which a property form's would not
        completeLabel={t('page.missing.complete')}
      >
        {children}
      </ChipProvider>
    </RequestMissingContext.Provider>
  );
}
