import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import RadioGroup from './RadioGroup';

const options = [
  { value: '01', label: 'Retired', isActive: false },
  { value: '04', label: 'Rectangle', isActive: true },
  { value: '99', label: 'Other' },
];

const names = () => screen.getAllByRole('radio').map(r => r.textContent);

describe('RadioGroup activeOnly', () => {
  it('leaves a retired option out', () => {
    render(<RadioGroup options={options} value="04" variant="button" activeOnly />);
    expect(names()).toEqual(['Rectangle', 'Other']);
  });

  it('keeps a retired option the value still holds, so a saved record shows it', () => {
    render(<RadioGroup options={options} value="01" variant="button" activeOnly />);
    expect(names()).toEqual(['Retired', 'Rectangle', 'Other']);
  });

  it('lists everything without the flag', () => {
    render(<RadioGroup options={options} value="04" variant="button" />);
    expect(names()).toEqual(['Retired', 'Rectangle', 'Other']);
  });
});
