import { describe, it, expect } from 'vitest';
import { deriveSecondRevisionVisibility } from '@/features/pricingAnalysis/domain/deriveSecondRevisionVisibility';

const group = (...propertyTypes: string[]) => propertyTypes.map(propertyType => ({ propertyType }));

describe('deriveSecondRevisionVisibility', () => {
  it('shows land rows for a land-only group', () => {
    expect(deriveSecondRevisionVisibility(group('L', 'L'))).toEqual({
      showLand: true,
      showBuilding: false,
    });
  });

  it('shows building rows for a condo group', () => {
    expect(deriveSecondRevisionVisibility(group('U'))).toEqual({
      showLand: false,
      showBuilding: true,
    });
  });

  it('shows both halves for a mixed LB + U group, which the priority code could not', () => {
    expect(deriveSecondRevisionVisibility(group('LB', 'U'))).toEqual({
      showLand: true,
      showBuilding: true,
    });
  });

  it('shows nothing for a group of unrelated types', () => {
    expect(deriveSecondRevisionVisibility(group('MAC', 'VEH'))).toEqual({
      showLand: false,
      showBuilding: false,
    });
  });

  it('tolerates an empty list and missing property types', () => {
    expect(deriveSecondRevisionVisibility([])).toEqual({ showLand: false, showBuilding: false });
    expect(deriveSecondRevisionVisibility([{ propertyType: null }])).toEqual({
      showLand: false,
      showBuilding: false,
    });
  });
});
