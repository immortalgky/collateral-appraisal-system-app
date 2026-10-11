import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SearchByInput from './SearchByInput';

const options = [
  { value: 'all', label: 'All fields', icon: 'magnifying-glass' },
  { value: 'name', label: 'Name', icon: 'user' },
];

const setup = (variant?: 'default' | 'pill') =>
  render(
    <SearchByInput
      options={options}
      field="all"
      onFieldChange={vi.fn()}
      value=""
      onChange={vi.fn()}
      variant={variant}
    />,
  );

describe('SearchByInput', () => {
  it('keeps the plain selector and its divider by default', () => {
    const { container } = setup();
    expect(container.querySelector('.w-px')).not.toBeNull();
    expect(screen.getByRole('button', { name: /All fields/ }).className).not.toContain(
      'bg-gray-100',
    );
  });

  it('draws the selector as the top bar’s grey pill, with a magnifier and no divider', () => {
    const { container } = setup('pill');
    const pill = screen.getByRole('button', { name: /All fields/ });
    expect(pill.className).toContain('bg-gray-100');
    expect(pill.className).toContain('h-7');
    expect(pill.className).toContain('rounded-lg');
    expect(container.querySelector('.w-px')).toBeNull();
    // still the white bordered box: the edge of an editable field is always drawn
    expect(container.firstElementChild?.className).toContain('border-gray-200');
    expect(container.firstElementChild?.className).toContain('bg-white');
    // the pill carries the keyboard ring, and switches the global outline off inline
    expect(pill.className).toContain('data-focus:ring-2');
    expect(pill.style.outlineStyle).toBe('none');
  });
});
