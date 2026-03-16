interface ComparableScore {
  score: number;
  price: number;
}

export function isScoreReasonable(
  survey: ComparableScore,
  compareSurveys: ComparableScore[],
): boolean {
  return compareSurveys.every(curr => {
    // If another survey has higher price, its score should not be lower
    if (curr.price > survey.price && curr.score < survey.score) {
      return false;
    }

    // If another survey has lower price, its score should not be higher
    if (curr.price < survey.price && curr.score > survey.score) {
      return false;
    }

    return true;
  });
}
