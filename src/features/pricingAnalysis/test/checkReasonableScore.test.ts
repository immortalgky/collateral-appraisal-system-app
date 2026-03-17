import { describe, it, expect } from 'vitest';
import { isScoreReasonable } from '@/features/pricingAnalysis/domain/checkWQSReasonableScore';

interface ComparableScore {
  score: number;
  price: number;
}

describe('isScoreReasonable', () => {
  it('returns true when all higher prices have equal or higher scores', () => {
    const survey: ComparableScore = { price: 100, score: 5 };
    const compareSurveys: ComparableScore[] = [
      { price: 120, score: 5 },
      { price: 130, score: 6 },
    ];

    expect(isScoreReasonable(survey, compareSurveys)).toBe(true);
  });

  it('returns false when a higher price has a lower score', () => {
    const survey: ComparableScore = { price: 100, score: 5 };
    const compareSurveys: ComparableScore[] = [
      { price: 120, score: 4 }, // invalid
    ];

    expect(isScoreReasonable(survey, compareSurveys)).toBe(false);
  });

  it('returns true when all lower prices have equal or lower scores', () => {
    const survey: ComparableScore = { price: 100, score: 5 };
    const compareSurveys: ComparableScore[] = [
      { price: 90, score: 5 },
      { price: 80, score: 4 },
    ];

    expect(isScoreReasonable(survey, compareSurveys)).toBe(true);
  });

  it('returns false when a lower price has a higher score', () => {
    const survey: ComparableScore = { price: 100, score: 5 };
    const compareSurveys: ComparableScore[] = [
      { price: 90, score: 6 }, // invalid
    ];

    expect(isScoreReasonable(survey, compareSurveys)).toBe(false);
  });

  it('ignores equal prices regardless of score', () => {
    const survey: ComparableScore = { price: 100, score: 5 };
    const compareSurveys: ComparableScore[] = [
      { price: 100, score: 1 },
      { price: 100, score: 10 },
    ];

    expect(isScoreReasonable(survey, compareSurveys)).toBe(true);
  });

  it('returns true for empty compareSurveys', () => {
    const survey: ComparableScore = { price: 100, score: 5 };

    expect(isScoreReasonable(survey, [])).toBe(true);
  });

  it('returns false if any one comparison is invalid among many', () => {
    const survey: ComparableScore = { price: 100, score: 5 };
    const compareSurveys: ComparableScore[] = [
      { price: 80, score: 4 },
      { price: 120, score: 6 },
      { price: 90, score: 7 }, // invalid
    ];

    expect(isScoreReasonable(survey, compareSurveys)).toBe(false);
  });
});
