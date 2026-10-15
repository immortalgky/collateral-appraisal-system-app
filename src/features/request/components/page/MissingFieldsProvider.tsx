import {
  createContext,
  useContext,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { useFormContext } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';
import { useRequestMissingFields, type MissingSummary } from '../../hooks/useRequestMissingFields';

interface MissingFieldsValue {
  /** null until the first parse of the form has run */
  summary: MissingSummary | null;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

/** What the page can ask of the provider from outside the tree it renders. */
export interface MissingFieldsHandle {
  /** Re-check the form now and open the popover (a failed Save or Submit). */
  show: () => void;
}

const MissingFieldsContext = createContext<MissingFieldsValue>({
  summary: null,
  isOpen: false,
  setOpen: () => {},
});

export const useMissingFields = () => useContext(MissingFieldsContext);

/**
 * Computes the missing fields once and shares them with the nav and the action bar, so the page
 * itself does not re-render when the result changes. Must sit inside the FormProvider.
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
  const methods = useFormContext();
  const { summary, refresh } = useRequestMissingFields(methods, schema);
  const [isOpen, setOpen] = useState(false);

  useImperativeHandle(
    handleRef,
    () => ({
      show: () => {
        refresh();
        setOpen(true);
      },
    }),
    [refresh],
  );

  const value = useMemo(() => ({ summary, isOpen, setOpen }), [summary, isOpen]);

  return <MissingFieldsContext.Provider value={value}>{children}</MissingFieldsContext.Provider>;
}
