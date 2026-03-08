type FactorTranslation = { language: string; factorName: string };

export const getTranslatedFactorName = (
  translations: FactorTranslation[] | undefined,
  language: string = 'en',
): string => {
  if (!translations?.length) return '';
  const lang = language.toLowerCase();
  const match = translations.find(t => t.language.toLowerCase() === lang);
  return match?.factorName ?? translations.find(t => t.language.toLowerCase() === 'en')?.factorName ?? translations[0].factorName;
};
