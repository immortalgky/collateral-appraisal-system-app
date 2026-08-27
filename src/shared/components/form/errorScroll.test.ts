import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flattenFormErrors, scrollToField } from './utils';

describe('flattenFormErrors', () => {
  it('returns the path and labelled text for a flat field', () => {
    const result = flattenFormErrors({ purpose: { message: 'Appraisal Purpose is required' } });
    expect(result).toEqual([{ path: 'purpose', text: 'Purpose: Appraisal Purpose is required' }]);
  });

  it('builds dotted paths for nested fields', () => {
    const result = flattenFormErrors({
      detail: { loanDetail: { bankingSegment: { message: 'Banking Segment is required' } } },
    });
    expect(result).toEqual([
      { path: 'detail.loanDetail.bankingSegment', text: 'Banking Segment: Banking Segment is required' },
    ]);
  });

  it('keeps the array index in the path but labels from the array name', () => {
    const result = flattenFormErrors({
      properties: [{ buildingType: { message: 'Building Type is required' } }],
    });
    expect(result).toEqual([
      { path: 'properties.0.buildingType', text: 'Building Type: Building Type is required' },
    ]);
  });

  it('targets the array itself for array-level errors, without a "root" segment', () => {
    const result = flattenFormErrors({
      titles: { root: { message: 'Title Information must have at least 1 item(s)' } },
    });
    expect(result).toEqual([
      { path: 'titles', text: 'Titles: Title Information must have at least 1 item(s)' },
    ]);
  });

  it('handles an error placed directly on the array field', () => {
    const result = flattenFormErrors({
      customers: { message: 'customers must have at least 1 item(s)' },
    });
    expect(result).toEqual([
      { path: 'customers', text: 'Customers: customers must have at least 1 item(s)' },
    ]);
  });

  it('returns every error, first one first, so callers can scroll to [0]', () => {
    const result = flattenFormErrors({
      purpose: { message: 'Appraisal Purpose is required' },
      properties: [{ buildingType: { message: 'Building Type is required' } }],
    });
    expect(result.map(e => e.path)).toEqual(['purpose', 'properties.0.buildingType']);
  });

  it('returns nothing for an empty error tree', () => {
    expect(flattenFormErrors({})).toEqual([]);
  });
});

describe('scrollToField', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // happy-dom does not implement scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  const scrolledElement = () => {
    const calls = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock
      .instances as Element[];
    return calls[0];
  };

  it('scrolls to the exact field when one exists', () => {
    document.body.innerHTML = `
      <div data-field="customers"><div data-field="customers.0.name" id="row"></div></div>`;
    scrollToField('customers.0.name');
    expect(scrolledElement().id).toBe('row');
  });

  it('prefers the container over a row when the error is on the array itself', () => {
    document.body.innerHTML = `
      <div data-field="customers" id="container">
        <div data-field="customers.0.name" id="row"></div>
      </div>`;
    scrollToField('customers');
    expect(scrolledElement().id).toBe('container');
  });

  it('falls back to the first row when the array has no container anchor', () => {
    document.body.innerHTML = `<div data-field="customers.0.name" id="row"></div>`;
    scrollToField('customers');
    expect(scrolledElement().id).toBe('row');
  });

  it('focuses the control inside the target', () => {
    document.body.innerHTML = `
      <div data-field="purpose"><button id="listbox-button"></button></div>`;
    scrollToField('purpose');
    expect(document.activeElement?.id).toBe('listbox-button');
  });

  it('is a silent no-op when nothing matches, rather than throwing', () => {
    document.body.innerHTML = `<div data-field="somethingElse"></div>`;
    expect(() => scrollToField('missing.field')).not.toThrow();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('is a silent no-op for an empty path', () => {
    expect(() => scrollToField('')).not.toThrow();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not break on paths containing characters that need CSS escaping', () => {
    document.body.innerHTML = `<div data-field="detail.loanDetail.bankingSegment" id="seg"></div>`;
    expect(() => scrollToField('detail.loanDetail.bankingSegment')).not.toThrow();
    expect(scrolledElement().id).toBe('seg');
  });
});
