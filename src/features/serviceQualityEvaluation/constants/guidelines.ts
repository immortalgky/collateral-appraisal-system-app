export const GUIDELINE_DESCRIPTIONS: Readonly<Record<number, Readonly<Record<number, string>>>> = {
  0: {
    1: 'Create a new evaluation book',
    2: 'There are more than 5 points of correction in the report',
    3: 'There were 3-4 corrections to the report',
    4: 'There are 1-2 corrections to the report',
    5: 'There has been no revision of the report',
  },
  1: {
    1: 'Can deliver the report book > 3.5 days',
    2: 'Report book can be delivered within ≤ 3-3.5 days',
    3: 'Report book can be delivered within ≤ 2.5-3 days',
    4: 'Report book can be delivered within ≤ 2-2.5 days',
    5: 'The report book can be delivered within 2 days',
  },
  2: {
    1: 'Should be improved',
    2: 'Fairly prepared',
    3: 'Moderately prepared',
    4: 'Well prepared',
    5: 'Very well prepared',
  },
  3: {
    1: 'Fix issues in reports in more than 60 minutes',
    2: 'Fix the problem in the report within 60 minutes',
    3: 'Fix the problem in the report within 50 minutes',
    4: 'Fix the problem in the report within 40 minutes',
    5: 'Fix the problem in the report within 30 minutes',
  },
  4: {
    1: 'It is at a level that should be improved.',
    2: 'It is at a fairly good level',
    3: 'It is at a moderate level',
    4: 'At a good level',
    5: 'It is at a very good level',
  },
};

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
