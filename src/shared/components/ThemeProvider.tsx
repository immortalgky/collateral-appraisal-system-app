import { useEffect, useLayoutEffect } from 'react';
import { useUIStore } from '@shared/store';
import { DENSITY_SCALE } from '@shared/components/densityConstants';

/**
 * Effect-only component. Reads the persisted theme and UI density from the store
 * and keeps <html> in sync: the data-theme attribute and the --cas-density
 * variable that scales the root font-size. Returns null.
 */
export default function ThemeProvider(): null {
  const theme = useUIStore(s => s.theme);
  const density = useUIStore(s => s.density);
  const formLayout = useUIStore(s => s.formLayout);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-form-layout', formLayout);
  }, [formLayout]);

  // Layout effect: zustand rehydrates persisted state synchronously, so writing the
  // scale before paint avoids a visible resize on load.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--cas-density', String(DENSITY_SCALE[density]));
  }, [density]);

  return null;
}
