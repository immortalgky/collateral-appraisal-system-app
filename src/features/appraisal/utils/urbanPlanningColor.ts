/**
 * The colour the town plan paints a zone in, as a hint to the appraiser: which colour a planning
 * type usually carries, and the swatch each colour code is drawn with. The codes are the
 * `TypeOfUrbanPlanning` and `UrbanPlanningColor` parameter codes; the recommendation is only a
 * starting value, the plan in force decides.
 */

/** TypeOfUrbanPlanning code -> UrbanPlanningColor code. A type with no entry has no usual colour. */
export const RECOMMENDED_COLOR: Readonly<Record<string, string>> = {
  '01': '01', // red
  '02': '02', // brown
  '03': '03', // orange
  '04': '04', // yellow
  // 05: none
  '06': '05', // purple
  '07': '07', // white with green diagonal lines
  '08': '06', // green
  '09': '09', // light brown
  '10': '08', // blue
};

export const recommendedColor = (planningType: unknown): string | undefined =>
  typeof planningType === 'string' ? RECOMMENDED_COLOR[planningType] : undefined;

/** Swatch fill by UrbanPlanningColor code. 07 (white, green diagonals) and 99 (other) are drawn specially. */
export const COLOR_SWATCH: Readonly<Record<string, string>> = {
  '01': '#d64545',
  '02': '#8b5a3c',
  '03': '#f0913a',
  '04': '#e8c33a',
  '05': '#8e6cc9',
  '06': '#5a9a6e',
  '08': '#3e7cc2',
  '09': '#c8a27c',
};

export const WHITE_GREEN_DIAGONAL = '07';
export const OTHER_COLOR = '99';
