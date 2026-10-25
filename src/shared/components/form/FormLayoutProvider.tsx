import type { ReactNode } from 'react';
import { useUIStore } from '@/shared/store';
import type { FormLayout } from '@/shared/types';
import { FormLayoutContext, type FormLayoutMode } from './formLayoutContext';

/** Sets the layout for everything below it, whatever the user's setting is. */
export function FormLayoutProvider({
  layout,
  children,
}: {
  layout: FormLayoutMode;
  children: ReactNode;
}) {
  return <FormLayoutContext.Provider value={layout}>{children}</FormLayoutContext.Provider>;
}

/**
 * The stored user setting (`formLayout`: `grid` | `classic`, kept as is so persisted choices keep
 * working) mapped onto the two layouts: `grid` is `compact`, `classic` is `standard`.
 */
const FROM_USER_SETTING: Record<FormLayout, FormLayoutMode> = {
  grid: 'compact',
  classic: 'standard',
};

/** Sets the layout from the user's setting. Wrap a property form screen with this. */
export function UserFormLayoutProvider({ children }: { children: ReactNode }) {
  const setting = useUIStore(s => s.formLayout);
  return <FormLayoutProvider layout={FROM_USER_SETTING[setting]}>{children}</FormLayoutProvider>;
}
