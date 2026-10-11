import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { requestTitleDefault, type RequestTitleDtoType } from '../../schemas/form';
import { useTitleStatus } from './titleHooks';

const title = (over: Partial<RequestTitleDtoType> = {}): RequestTitleDtoType => ({
  ...structuredClone(requestTitleDefault),
  collateralType: '01',
  titleNumber: '1',
  ...over,
});
const doc = (over: object = {}) => ({
  isRequired: true,
  fileName: null,
  documentType: 'x',
  ...over,
});

describe('useTitleStatus', () => {
  it('lists what each title lacks', () => {
    const { result } = renderHook(() => useTitleStatus([title(), title({ collateralType: '' })]));
    expect(result.current.missing[0]).toContain('ownerName');
    expect(result.current.missing[1]).toContain('collateralType');
  });

  it('does not re-check a title whose fields did not change, even if it is a new object', () => {
    const { result, rerender } = renderHook(({ list }) => useTitleStatus(list), {
      initialProps: { list: [title(), title({ titleNumber: '2' })] },
    });
    const first = result.current.missing;
    rerender({ list: [title(), title({ titleNumber: '2', ownerName: 'x' })] });
    expect(result.current.missing[0]).toBe(first[0]);
    expect(result.current.missing[1]).not.toBe(first[1]);
    expect(result.current.missing[1]).not.toContain('ownerName');
  });

  it('does not re-check on a document change, nor tell the row to redraw: a row shows no files', () => {
    const { result, rerender } = renderHook(({ list }) => useTitleStatus(list), {
      initialProps: { list: [title({ documents: [doc()] as never })] },
    });
    const { missing, sigs } = result.current;
    rerender({ list: [title({ documents: [doc({ fileName: 'a.pdf' })] as never })] });
    expect(result.current.missing[0]).toBe(missing[0]);
    expect(result.current.sigs[0]).toBe(sigs[0]);
  });

  it('tells the row to redraw when one of its own fields changes', () => {
    const { result, rerender } = renderHook(({ list }) => useTitleStatus(list), {
      initialProps: { list: [title()] },
    });
    const { sigs } = result.current;
    rerender({ list: [title({ ownerName: 'someone else' })] });
    expect(result.current.sigs[0]).not.toBe(sigs[0]);
  });

  it('keeps the row signature when nothing a row shows changed', () => {
    const { result, rerender } = renderHook(({ list }) => useTitleStatus(list), {
      initialProps: { list: [title({ documents: [doc({ uploadedAt: 'a' })] as never })] },
    });
    const { sigs } = result.current;
    rerender({ list: [title({ documents: [doc({ uploadedAt: 'b' })] as never })] });
    expect(result.current.sigs[0]).toBe(sigs[0]);
  });
});
