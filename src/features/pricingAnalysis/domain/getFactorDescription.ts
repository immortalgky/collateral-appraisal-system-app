import type { FactorDataType } from '../schemas';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';

export const getFactorDesciption = (
  factorCode: string,
  allFactors: FactorDataType[] = [],
  language: string = 'EN',
) => {
  const factor = allFactors.find(f => f.factorCode === factorCode);
  return factor ? getTranslatedFactorName(factor.translations, language) : null;
};
