import { useEffect } from 'react';
import { useUIStore } from '@shared/store';

/**
 * Effect-only component. Reads the persisted theme from the store and
 * keeps the <html data-theme="..."> attribute in sync. Returns null.
 */
export default function ThemeProvider(): null {
  const theme = useUIStore(s => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}
