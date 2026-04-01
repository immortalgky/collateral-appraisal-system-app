export function getAllowedMethodsForAssumption(assumptionType: string | null): string[] {
  switch (assumptionType) {
    case '23': // Room Income
      return ['01', '02', '03', '04'];
    case '13': // Miscellaneous
      return ['13', '14'];
    case 'gop':
      return ['15'];
    default:
      return ['13', '14']; // or based on category/section later
  }
}
