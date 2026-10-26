import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { BriefAsset } from '../api/appraisalBrief';
import CollateralSummaryStack from './CollateralSummaryStack';

const condo = { propertyType: 'U', roomNumber: '1205', condoFloorNumber: '12', condoFloors: 30 };
const land = { propertyType: 'L', areaRai: 1, areaNgan: 0, areaSquareWa: 0, landUseType: [] };
const assets = [condo, land] as unknown as BriefAsset[];

describe('CollateralSummaryStack, flat', () => {
  it('is the hero without a model: the title and the cards on the sky, no canvas, toolbar or pins', () => {
    const { container } = render(<CollateralSummaryStack assets={assets} project={null} flat />);
    expect(container.querySelector('.cs3d-flat')).not.toBeNull();
    expect(container.querySelector('.cs3d-title-h')?.textContent).toBeTruthy();
    expect(container.querySelector('.cs3d-gcard')).not.toBeNull();
    // Nothing of the scene: no canvas area, no toolbar, no pins, none of the overlay hero.
    expect(container.querySelector('.cs3d')).toBeNull();
    expect(container.querySelector('.cs3d-toolbar')).toBeNull();
    expect(container.querySelector('.cs3d-co')).toBeNull();
    expect(container.querySelector('.cs3d-hero')).toBeNull();
    expect(container.querySelector('.cs3d-box')).not.toHaveAttribute('aria-busy');
  });

  it('is not the loading frame: that one keeps its canvas area and is busy', () => {
    const { container } = render(<CollateralSummaryStack assets={assets} project={null} frame />);
    expect(container.querySelector('.cs3d-hero .cs3d')).not.toBeNull();
    expect(container.querySelector('.cs3d-box')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.cs3d-flat')).toBeNull();
  });
});
