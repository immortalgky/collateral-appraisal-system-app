import { describe, expect, it } from 'vitest';
import { vmsg } from '@/shared/components/form/validationMessage';
import { createRequestForm, createRequestFormDefault, refineRetailSellingPrice } from './form';

const blankCustomer = { name: '', contactNumber: '' };
const blankProperty = {
  propertyType: '',
  buildingType: '',
  buildingTypeOther: '',
  sellingPrice: '',
};
const customer = { name: 'Somchai', contactNumber: '' };
const property = { propertyType: '01', buildingType: '01', buildingTypeOther: '', sellingPrice: 5 };

const paths = (values: Record<string, unknown>) => {
  const result = createRequestForm.safeParse({ ...createRequestFormDefault, ...values });
  return result.success ? [] : result.error.issues.map(i => i.path.join('.'));
};
const issues = (values: Record<string, unknown>) => {
  const result = createRequestForm.safeParse({ ...createRequestFormDefault, ...values });
  return result.success ? [] : result.error.issues;
};
const under = (list: string[], root: string) =>
  list.filter(p => p === root || p.startsWith(`${root}.`));

describe('untouched rows of the customers and properties tables', () => {
  it('a blank row beside a filled one asks for nothing', () => {
    const found = paths({
      customers: [customer, blankCustomer],
      properties: [property, blankProperty],
    });
    expect(under(found, 'customers')).toEqual([]);
    expect(under(found, 'properties')).toEqual([]);
  });

  it('only blank rows fail with the at-least-one message, on the array itself', () => {
    const list = issues({ customers: [blankCustomer], properties: [blankProperty] });
    const customers = list.filter(i => i.path.join('.') === 'customers');
    const properties = list.filter(i => i.path.join('.') === 'properties');
    expect(customers.map(i => i.message)).toEqual([vmsg('minItems', { min: 1 })]);
    expect(properties.map(i => i.message)).toEqual([vmsg('minItems', { min: 1 })]);
    // …and no field of the blank row is called missing
    expect(
      under(
        list.map(i => i.path.join('.')),
        'customers.0',
      ),
    ).toEqual([]);
    expect(
      under(
        list.map(i => i.path.join('.')),
        'properties.0',
      ),
    ).toEqual([]);
  });

  it("keeps a filled row's error at its own position when a blank row comes first", () => {
    const found = paths({
      customers: [blankCustomer, { name: '', contactNumber: '0812345678' }],
      properties: [property],
    });
    expect(found).toContain('customers.1.name');
    expect(under(found, 'customers.0')).toEqual([]);
  });

  it('a row with anything typed in it is validated like any other', () => {
    const found = paths({
      customers: [customer],
      properties: [{ ...blankProperty, sellingPrice: 5 }],
    });
    expect(found).toContain('properties.0.propertyType');
  });

  it('a RETAIL request does not ask a blank property row for a price', () => {
    // zod runs this rule only once the base rules pass, so it is run on its own here, as the
    // missing-fields count does
    const retailIssues = (properties: { sellingPrice?: unknown }[]) => {
      const found: string[] = [];
      refineRetailSellingPrice(
        { detail: { loanDetail: { bankingSegment: 'RETAIL' } }, properties },
        {
          addIssue: (issue: { path: (string | number)[] }) => found.push(issue.path.join('.')),
        } as never,
        '',
      );
      return found;
    };
    expect(retailIssues([property, blankProperty])).toEqual([]);
    expect(retailIssues([{ ...property, sellingPrice: null }, blankProperty])).toEqual([
      'properties.0.sellingPrice',
    ]);
  });
});
