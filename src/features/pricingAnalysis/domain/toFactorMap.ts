import type { FactorDataType } from '../schemas';
import { readFactorValue } from './readFactorValue';

export function toFactorMap(factorData: FactorDataType[]) {
  return (factorData ?? []).reduce((acc, s) => {
    const v = readFactorValue({
      dataType: s.dataType,
      fieldDecimal: s.fieldDecimal,
      value: s.value,
    });
    if (v !== undefined) acc.set(s.factorCode, v);
    return acc;
  }, new Map<string, string | number>());
}
