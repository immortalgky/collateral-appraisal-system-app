import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render } from '@/test/test-utils';
import type { ProjectModel } from '../../../types';
import { VillageModelFacts } from './VillageModelFacts';

const figures = vi.hoisted(() => ({
  hasUnits: true,
  units: { total: 1234, sold: 0 },
}));

vi.mock('./useTowerModelFigures', () => ({
  useTowerModelFigures: () => ({ hasUnits: figures.hasUnits, unitsOfModel: () => figures.units }),
}));

const facts = (model: Partial<ProjectModel>) =>
  render(<VillageModelFacts model={{ id: 'm1', projectId: 'p', ...model } as ProjectModel} />)
    .container.textContent;

describe('VillageModelFacts', () => {
  it('fills in the number of houses, with no placeholder left over', () => {
    figures.hasUnits = true;
    figures.units = { total: 1234, sold: 0 };

    const text = facts({ finalAppraisedValue: 3_500_000 });

    expect(text).toBe('Used by 1,234 houses · Standard price ฿3,500,000.00 / house');
    expect(text).not.toContain('{{');
  });

  it('adds the sold count when some houses are sold', () => {
    figures.hasUnits = true;
    figures.units = { total: 12, sold: 3 };

    const text = facts({ finalAppraisedValue: 3_500_000 });

    expect(text).toBe('Used by 12 houses (3 sold) · Standard price ฿3,500,000.00 / house');
    expect(text).not.toContain('{{');
  });

  it('says the model awaits analysis when it has no standard price, and skips units before any exist', () => {
    figures.hasUnits = false;

    expect(facts({})).toBe('Awaiting analysis');
  });
});
