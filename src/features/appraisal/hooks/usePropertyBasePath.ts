import { useLocation } from 'react-router-dom';

/**
 * Returns 'property-pma' or 'property' based on the current URL.
 * Components use this to build navigation paths that stay within the correct context.
 */
export function usePropertyBasePath(): 'property' | 'property-pma' {
  const { pathname } = useLocation();
  return pathname.includes('/property-pma') ? 'property-pma' : 'property';
}
