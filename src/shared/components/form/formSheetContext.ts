import { createContext, useContext } from 'react';

/** True inside a `FormSection` body: `FormFields` lay themselves out for the form's layout there. */
export const FormSectionBodyContext = createContext(false);

/**
 * True where there is no table of contents to show each section's missing-fields status (the shell
 * without its rail): a `FormSection` then shows it in its own header. Set by `FormShellBody`.
 */
export const FormSectionStatusContext = createContext(false);

/** One section as the table of contents needs it. */
export interface FormSectionEntry {
  id: string;
  title: string;
  icon?: string;
}

export interface RegisteredFormSection extends FormSectionEntry {
  el: HTMLElement;
}

/** Set by `FormSectionsProvider`; a `FormSection` registers itself with it and gets a cleanup back. */
export const FormSectionRegistryContext = createContext<
  ((section: RegisteredFormSection) => () => void) | null
>(null);

export const FormSectionListContext = createContext<FormSectionEntry[]>([]);

/**
 * The sections currently mounted below the nearest `FormSectionsProvider`, in page order. The
 * shell's table of contents renders one link per entry (`#id`). Empty without a provider.
 */
export function useFormSections(): FormSectionEntry[] {
  return useContext(FormSectionListContext);
}
