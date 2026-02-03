export const qualitativeDefault = [0, -5, 5];
export type QualitativeLevel = 'E' | 'I' | 'B' | '';
export const qualitativeDefaultPercent = (level: QualitativeLevel): number => {
  if (level === 'E') return 0;
  if (level === 'I') return 5;
  if (level === 'B') return -5;
  return 0;
};
