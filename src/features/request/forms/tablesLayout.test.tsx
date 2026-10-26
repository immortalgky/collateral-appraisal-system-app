import { describe, expect, it } from 'vitest';
import '@/i18n';
import { act } from '@testing-library/react';
import { type FieldValues, FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import CustomersForm from './CustomersForm';
import PropertiesForm from './PropertiesForm';

let form: UseFormReturn<FieldValues>;

function Harness({ children, defaults }: { children: React.ReactNode; defaults: object }) {
  const methods = useForm({ defaultValues: defaults });
  form = methods;
  return <FormProvider {...methods}>{children}</FormProvider>;
}

/** The grid's tracks, its header cells and each row's cells: all must be the same count. */
const shape = () => {
  const grid = document.querySelector('[style*="--cas-cols"]') as HTMLElement;
  const tracks = grid.style.getPropertyValue('--cas-cols').trim().split(/\s+/).length;
  const [header, ...rows] = Array.from(grid.children).filter(c => c.className.includes('grid'));
  return { tracks, header: header.children.length, rows: rows.map(r => r.children.length) };
};

describe('request tables keep one grid cell per track', () => {
  it.each([
    ['non-99 building type', '01'],
    ['building type 99 (the "other" text)', '99'],
  ])('properties: %s', (_label, buildingType) => {
    render(
      <Harness
        defaults={{
          detail: { loanDetail: {} },
          properties: [
            { propertyType: 'LB', buildingType, buildingTypeOther: 'x', sellingPrice: 1 },
            { propertyType: '', buildingType: '', buildingTypeOther: '', sellingPrice: '' },
          ],
        }}
      >
        <PropertiesForm />
      </Harness>,
    );
    // seq | type | building | price | actions
    expect(shape()).toEqual({ tracks: 5, header: 5, rows: [5, 5] });
  });

  it('properties: the real Building Type cell is disabled for a type without a building', () => {
    render(
      <Harness
        defaults={{
          detail: { loanDetail: {} },
          properties: [
            { propertyType: 'VEH', buildingType: null, buildingTypeOther: null, sellingPrice: 1 },
            { propertyType: 'LB', buildingType: '01', buildingTypeOther: null, sellingPrice: 2 },
          ],
        }}
      >
        <PropertiesForm />
      </Harness>,
    );
    const cell = (row: number) =>
      document.querySelector(`[data-field="properties.${row}.buildingType"] button`);
    expect(cell(0)).toBeDisabled();
    expect(cell(1)).not.toBeDisabled();
  });

  it('properties: changing a filled LB row to VEH empties its building type and "other" text', () => {
    render(
      <Harness
        defaults={{
          detail: { loanDetail: {} },
          properties: [
            { propertyType: 'LB', buildingType: '99', buildingTypeOther: 'x', sellingPrice: 1 },
          ],
        }}
      >
        <PropertiesForm />
      </Harness>,
    );
    act(() => form.setValue('properties.0.propertyType', 'VEH'));
    expect(form.getValues('properties.0')).toMatchObject({
      propertyType: 'VEH',
      buildingType: null,
      buildingTypeOther: null,
    });
  });

  it('properties: the dealer code sits under the table, after the total row, with no hint', () => {
    render(
      <Harness
        defaults={{
          detail: { loanDetail: {}, contact: { dealerCode: '' } },
          properties: [
            { propertyType: 'L', buildingType: '01', buildingTypeOther: '', sellingPrice: 5 },
          ],
        }}
      >
        <PropertiesForm />
      </Harness>,
    );
    const table = document.querySelector('[style*="--cas-cols"]') as HTMLElement;
    const dealer = document.querySelector('[data-field="detail.contact.dealerCode"]') as Element;
    expect(dealer).toBeInTheDocument();
    expect(table.compareDocumentPosition(dealer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('e.g. project code')).not.toBeInTheDocument();
  });

  it('customers: rows are top-aligned, so an error under one cell moves no neighbour', () => {
    render(
      <Harness defaults={{ customers: [{ name: '', contactNumber: '' }] }}>
        <CustomersForm />
      </Harness>,
    );
    const grid = document.querySelector('[style*="--cas-cols"]') as HTMLElement;
    for (const row of Array.from(grid.children)) {
      expect(row).toHaveClass('items-start');
      expect(row).not.toHaveClass('items-center');
    }
  });

  it('customers: seq | name | phone | actions', () => {
    render(
      <Harness defaults={{ customers: [{ name: 'a', contactNumber: '1' }] }}>
        <CustomersForm />
      </Harness>,
    );
    expect(shape()).toEqual({ tracks: 4, header: 4, rows: [4] });
  });

  it('both tables show one row on an editable form that opens with none', () => {
    render(
      <Harness defaults={{ customers: [], properties: [], detail: { loanDetail: {} } }}>
        <CustomersForm />
        <PropertiesForm />
      </Harness>,
    );
    expect(screen.queryByText('Add First Item')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[style*="--cas-cols"]')).toHaveLength(2);
  });
});
