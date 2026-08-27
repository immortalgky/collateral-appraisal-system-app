import { useCallback } from 'react';
import { useLocaleStore } from '../store';

/**
 * Companies have two names: `name` (English, always present) and `nameLocal`
 * (Thai, nullable). Show `nameLocal` when the data language is Thai,
 * otherwise `name`. Always fall back to `name` when `nameLocal` is
 * null/empty. Display only — never use the resolved label as an API payload
 * value; keep sending the canonical English `name`/`companyName` there.
 */
export const resolveLocalizedName = (
  name: string,
  nameLocal: string | null | undefined,
  language: string,
): string => (language === 'th' ? (nameLocal?.trim() || name) : name);

export const useLocalizedCompanyName = () => {
  const language = useLocaleStore(s => s.language);
  return useCallback(
    (name: string, nameLocal: string | null | undefined) => resolveLocalizedName(name, nameLocal, language),
    [language],
  );
};
