import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SourceSwitch from './SourceSwitch';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const renderSwitch = (consumerCount?: number, outboxCount?: number) =>
  render(
    <SourceSwitch
      source="consumer"
      onChange={vi.fn()}
      consumerCount={consumerCount}
      outboxCount={outboxCount}
    />,
  );

describe('SourceSwitch badges', () => {
  it('shows no badge at all while the counts are unknown (not a grey 0)', () => {
    renderSwitch(undefined, undefined);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    for (const button of screen.getAllByRole('button'))
      expect(button.querySelector('.rounded-full')).toBeNull();
  });

  it('shows a real zero once the count is known to be zero', () => {
    renderSwitch(0, 3);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides only the badge whose count is unknown', () => {
    renderSwitch(5, undefined);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByRole('button')[1].querySelector('.rounded-full')).toBeNull();
  });
});
