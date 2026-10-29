import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { PropertyItem } from '../types';
import { PlaceValue, PropertyCardContent } from './PropertyCardContent';

// A building whose depreciation rows are all ส่วนพัฒนา carries a grey chip beside the amber
// under-construction one.

const building = {
  id: 'p1',
  type: 'B',
  numberOfFloors: 3,
} as unknown as PropertyItem;

describe('development-only chip on a building row', () => {
  it('shows the chip with its hint when the building is development-only', () => {
    render(<PlaceValue property={{ ...building, isDevelopmentOnly: true }} />);

    const chip = screen.getByText('properties.developmentOnly');
    expect(chip).toHaveAttribute('title', 'properties.developmentOnlyHint');
  });

  it('puts the amber under-construction chip first and the grey one after it', () => {
    render(
      <PlaceValue
        property={{
          ...building,
          isDevelopmentOnly: true,
          isUnderConstruction: true,
          constructionProgressPct: 70,
        }}
      />,
    );

    const amber = screen.getByText('properties.underConstructionPct');
    const grey = screen.getByText('properties.developmentOnly');
    expect(amber.compareDocumentPosition(grey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows no chip otherwise', () => {
    render(<PlaceValue property={building} />);

    expect(screen.queryByText('properties.developmentOnly')).not.toBeInTheDocument();
  });

  it('shows the chip instead of the dash when a building has no type, floors or age', () => {
    render(
      <PlaceValue property={{ type: 'B', isDevelopmentOnly: true } as unknown as PropertyItem} />,
    );

    expect(screen.getByText('properties.developmentOnly')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('still shows the dash for a bare building that is not development-only', () => {
    render(<PlaceValue property={{ type: 'B' } as unknown as PropertyItem} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('puts the chip in the facts line of a land-with-building row', () => {
    render(
      <PropertyCardContent
        size="md"
        property={
          { id: 'p2', type: 'LB', address: 'x', isDevelopmentOnly: true } as unknown as PropertyItem
        }
      />,
    );

    expect(screen.getAllByText('properties.developmentOnly')).toHaveLength(1);
  });

  it('puts no chip in the facts line of a land-with-building row that is not development-only', () => {
    render(
      <PropertyCardContent
        size="md"
        property={{ id: 'p2', type: 'LB', address: 'x' } as unknown as PropertyItem}
      />,
    );

    expect(screen.queryByText('properties.developmentOnly')).not.toBeInTheDocument();
  });
});
