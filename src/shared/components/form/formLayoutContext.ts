import { createContext, useContext } from 'react';

/**
 * The two form layouts of the app. Components pick their classes from `useFormLayout()`.
 *
 * - `standard`: label above the input. The default everywhere.
 * - `compact`: label beside the input, denser rows. Only the property form screens opt in, from the
 *   user's setting (`UserFormLayoutProvider`).
 */
export type FormLayoutMode = 'standard' | 'compact';

export const FormLayoutContext = createContext<FormLayoutMode>('standard');

/** The layout the form around this component uses. `standard` outside any provider. */
export function useFormLayout(): FormLayoutMode {
  return useContext(FormLayoutContext);
}
