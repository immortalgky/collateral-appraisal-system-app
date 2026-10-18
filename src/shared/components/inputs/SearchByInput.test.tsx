import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SearchByInput from './SearchByInput';

const options = [
  { value: 'all', label: 'All fields', icon: 'magnifying-glass' },
  { value: 'name', label: 'Name', icon: 'user' },
];

const setup = (variant?: 'default' | 'pill', onFieldClick = vi.fn()) =>
  render(
    <SearchByInput
      options={options}
      field="all"
      onFieldChange={vi.fn()}
      value=""
      onChange={vi.fn()}
      variant={variant}
      onFieldClick={onFieldClick}
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
    expect(pill.className).toContain('focus-visible:ring-2');
    expect(pill.style.outlineStyle).toBe('none');
  });

  it('has no menu on the pill: a click, Enter or Space just calls onFieldClick', async () => {
    const onFieldClick = vi.fn();
    const { user } = setup('pill', onFieldClick);
    const pill = screen.getByRole('button', { name: /All fields/ });
    // a Headless UI menu button would say aria-haspopup="menu"; this one opens a panel
    expect(pill.getAttribute('aria-haspopup')).toBe('dialog');
    await user.click(pill);
    expect(onFieldClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('menuitem')).toBeNull();
    pill.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onFieldClick).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps the menu on the default variant', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /All fields/ }));
    expect(await screen.findByRole('menu')).toBeTruthy();
  });

  it('names the pill from its aria label and the current scope, and reports the panel state', () => {
    render(
      <SearchByInput
        options={options}
        field="name"
        onFieldChange={vi.fn()}
        value=""
        onChange={vi.fn()}
        variant="pill"
        fieldAriaLabel="Search in field"
        fieldExpanded
      />,
    );
    const pill = screen.getByRole('button', { name: 'Search in field: Name' });
    expect(pill).toHaveAttribute('aria-expanded', 'true');
  });
});
