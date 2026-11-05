import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Dropdown from './Dropdown';
import NativeSelect from './NativeSelect';
import NumberInput from './NumberInput';
import DatePickerInput from './DatePickerInput';
import ParameterSearchInput from './ParameterSearchInput';
import { FormLayoutProvider } from '../form/FormLayoutProvider';

vi.mock('../../utils/parameterUtils', () => ({
  useParameterOptions: function useParameterOptions() {
    return [];
  },
}));

// Only a native text input takes `min-h-*` (Thai tone marks clip in a fixed-height input,
// DESIGN.md 17.3). A select and a button trigger keep the fixed `h-*`.
describe('fixed-height controls in a Compact form', () => {
  it('NativeSelect keeps h-ctl-c and has no min-h-ctl-c', () => {
    render(
      <FormLayoutProvider layout="compact">
        <NativeSelect aria-label="Native">
          <option>A</option>
        </NativeSelect>
      </FormLayoutProvider>,
    );

    const select = screen.getByLabelText('Native');
    expect(select).toHaveClass('h-ctl-c');
    expect(select).not.toHaveClass('min-h-ctl-c');
  });

  it('the Dropdown trigger keeps h-ctl-c and has no min-h-ctl-c', () => {
    render(
      <FormLayoutProvider layout="compact">
        <Dropdown
          options={[{ value: 'a', label: 'A', id: 1 }]}
          value={null}
          onChange={() => {}}
          placeholder="Pick"
        />
      </FormLayoutProvider>,
    );

    const trigger = screen.getByRole('button', { name: /pick/i });
    expect(trigger).toHaveClass('h-ctl-c');
    expect(trigger).not.toHaveClass('min-h-ctl-c');
  });
});

// A native text input (or the box that wraps a borderless one) takes `min-h-*` instead.
describe('min-height text controls in a Compact form', () => {
  const expectMin = (el: Element | null) => {
    expect(el).toHaveClass('min-h-ctl-c');
    expect(el).not.toHaveClass('h-ctl-c');
  };

  it('DatePickerInput', () => {
    render(
      <FormLayoutProvider layout="compact">
        <DatePickerInput aria-label="Date" value="" onChange={() => {}} />
      </FormLayoutProvider>,
    );
    expectMin(screen.getByLabelText('Date'));
  });

  it('NumberInput with a suffix: the wrapper has the min-height, the inner input none', () => {
    render(
      <FormLayoutProvider layout="compact">
        <NumberInput aria-label="Area" suffix="m" value={1} onChange={() => {}} />
      </FormLayoutProvider>,
    );
    const input = screen.getByLabelText('Area');
    expectMin(input.parentElement);
    expect(input).not.toHaveClass('h-ctl-c');
    expect(input).not.toHaveClass('h-full');
  });

  it('Dropdown "other": the wrapper has the min-height, the inner input none', () => {
    render(
      <FormLayoutProvider layout="compact">
        <Dropdown
          options={[{ value: '99', label: 'Other', id: 1 }]}
          value="99"
          otherField
          otherText=""
          onOtherTextChange={() => {}}
          onChange={() => {}}
        />
      </FormLayoutProvider>,
    );
    const input = screen.getAllByRole('textbox')[0];
    expectMin(input.parentElement?.parentElement ?? null);
    expect(input).not.toHaveClass('h-ctl-c');
    expect(input).not.toHaveClass('h-full');
  });

  it('ParameterSearchInput', () => {
    render(
      <FormLayoutProvider layout="compact">
        <ParameterSearchInput group="g" value="" onChange={() => {}} />
      </FormLayoutProvider>,
    );
    expectMin(screen.getAllByRole('combobox', { hidden: true })[0]);
  });
});
