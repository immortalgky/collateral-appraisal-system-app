import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  FormSectionListContext,
  FormSectionRegistryContext,
  type RegisteredFormSection,
} from './formSheetContext';

/**
 * Wrap the page shell (the form and its rail) with this and every `FormSection` below registers its
 * title and id, so the table of contents in the rail can list them with `useFormSections()`.
 */
export function FormSectionsProvider({ children }: { children: ReactNode }) {
  const [registered, setRegistered] = useState<RegisteredFormSection[]>([]);

  const register = useCallback((section: RegisteredFormSection) => {
    setRegistered(list => [...list.filter(s => s.el !== section.el), section]);
    return () => setRegistered(list => list.filter(s => s.el !== section.el));
  }, []);

  // Registration order is mount order, which a conditional section breaks; the page order is the DOM's.
  const sections = useMemo(
    () =>
      [...registered]
        .sort((a, b) =>
          a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        )
        .map(({ id, title, icon }) => ({ id, title, icon })),
    [registered],
  );

  return (
    <FormSectionRegistryContext.Provider value={register}>
      <FormSectionListContext.Provider value={sections}>{children}</FormSectionListContext.Provider>
    </FormSectionRegistryContext.Provider>
  );
}
