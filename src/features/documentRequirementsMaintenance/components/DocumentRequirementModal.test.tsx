import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import '@/i18n';
import { render, screen, waitFor } from '@/test/test-utils';
import DocumentRequirementModal from './DocumentRequirementModal';
import type { DocumentRequirementDto } from '../types';

const mockTypes = vi.hoisted(() => ({
  data: undefined as unknown,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
  renders: 0,
}));

// Stands in for the query: no network, and a render budget so a loop fails instead of hanging.
vi.mock('@/features/request/api/documentTypes', async importOriginal => {
  const real = await importOriginal<typeof import('@/features/request/api/documentTypes')>();
  return {
    ...real,
    useGetDocumentTypes: () => {
      if (++mockTypes.renders > 100) throw new Error('modal re-rendered more than 100 times');
      return {
        data: mockTypes.data,
        isError: mockTypes.isError,
        isFetching: mockTypes.isFetching,
        refetch: mockTypes.refetch,
      };
    },
  };
});

const requirement = (over: Partial<DocumentRequirementDto>): DocumentRequirementDto => ({
  id: 'r1',
  documentTypeId: 'a',
  documentTypeCode: 'D001',
  documentTypeName: 'Deed',
  propertyTypeCode: null,
  purposeCode: null,
  isRequired: true,
  isActive: true,
  ...over,
});

const props = { onClose: vi.fn(), onSubmit: vi.fn(), requirements: [] as DocumentRequirementDto[] };

describe('DocumentRequirementModal', () => {
  let error: MockInstance<typeof console.error>;

  beforeEach(() => {
    mockTypes.data = undefined;
    mockTypes.isError = false;
    mockTypes.isFetching = false;
    mockTypes.refetch.mockClear();
    mockTypes.renders = 0;
    error = vi.spyOn(console, 'error');
  });

  afterEach(() => error.mockRestore());

  // Open on a cold cache: the query is still pending, so `data` is undefined.
  it('does not loop while the document types are still loading', () => {
    render(<DocumentRequirementModal isOpen {...props} />);

    expect(error).not.toHaveBeenCalled();
    expect(mockTypes.renders).toBeLessThan(10);
  });

  it('ticks a type that already has a requirement once the types arrive', async () => {
    const loaded = [{ id: 'a', code: 'D001', name: 'Deed' }];
    const requirements = [requirement({})];
    const modal = () => <DocumentRequirementModal isOpen {...props} requirements={requirements} />;
    const { rerender } = render(modal());

    mockTypes.data = loaded;
    rerender(modal());

    const deed = await screen.findByRole('checkbox', { name: 'D001 - Deed' });
    expect(deed).toHaveAttribute('aria-checked', 'true');
    expect(error).not.toHaveBeenCalled();
  });

  it('cannot be saved until the document types are loaded', async () => {
    const onSubmit = vi.fn();
    const requirements = [requirement({})];
    const modal = () => (
      <DocumentRequirementModal isOpen {...props} onSubmit={onSubmit} requirements={requirements} />
    );
    const { user, rerender } = render(modal());

    const save = await screen.findByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await user.click(save);
    expect(onSubmit).not.toHaveBeenCalled();

    mockTypes.data = [{ id: 'a', code: 'D001', name: 'Deed' }];
    rerender(modal());
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('says so while the types load, when they fail, and when there are none', async () => {
    const modal = () => <DocumentRequirementModal isOpen {...props} />;
    const { rerender } = render(modal());
    expect(await screen.findByText('Loading document types…')).toBeInTheDocument();

    mockTypes.isError = true;
    rerender(modal());
    expect(screen.getByText('Could not load document types.')).toBeInTheDocument();

    mockTypes.isError = false;
    mockTypes.data = [];
    rerender(modal());
    expect(screen.getByText(/^No document types\./)).toBeInTheDocument();
  });

  it('offers a retry, with Save disabled, when the types failed to load', async () => {
    mockTypes.isError = true;
    const { user } = render(<DocumentRequirementModal isOpen {...props} />);

    expect(await screen.findByText(/Could not load document types\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockTypes.refetch).toHaveBeenCalledTimes(1);
  });

  it('disables Retry while the refetch is running', async () => {
    mockTypes.isError = true;
    mockTypes.isFetching = true;
    render(<DocumentRequirementModal isOpen {...props} />);

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeDisabled();
  });

  it('does not report a failure when a refetch fails over types it already has', async () => {
    mockTypes.isError = true;
    mockTypes.data = [];
    render(<DocumentRequirementModal isOpen {...props} />);

    expect(await screen.findByText(/^No document types\./)).toBeInTheDocument();
    expect(screen.queryByText(/Could not load/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('keeps a requirement on a type that is not in the list when saving', async () => {
    mockTypes.data = [
      { id: 'a', code: 'D001', name: 'Deed' },
      { id: 'b', code: 'D002', name: 'Title' },
    ];
    const onSubmit = vi.fn();
    const requirements = [
      requirement({}),
      requirement({ id: 'r3', documentTypeId: 'b' }),
      requirement({ id: 'r5', documentTypeId: 'gone', isRequired: false }),
      requirement({ id: 'r4', documentTypeId: 'elsewhere', propertyTypeCode: 'L' }),
      requirement({ id: 'r2', documentTypeId: 'gone', isRequired: false }),
    ];
    const { user } = render(
      <DocumentRequirementModal
        isOpen
        {...props}
        onSubmit={onSubmit}
        requirements={requirements}
      />,
    );

    // A listed type the user unticks is removed; an unlisted one in this scope stays (sent once even
    // with two rows), and one in another scope is not touched.
    await user.click(await screen.findByRole('checkbox', { name: 'D002 - Title' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      propertyTypeCode: null,
      purposeCode: null,
      items: [
        { documentTypeId: 'a', isRequired: true },
        { documentTypeId: 'gone', isRequired: false },
      ],
    });
  });

  it('drops unsaved ticks when the modal is closed and opened again', async () => {
    mockTypes.data = [{ id: 'a', code: 'D001', name: 'Deed' }];
    const requirements = [requirement({})];
    const modal = (isOpen: boolean) => (
      <DocumentRequirementModal isOpen={isOpen} {...props} requirements={requirements} />
    );
    const { user, rerender } = render(modal(true));

    await user.click(await screen.findByRole('checkbox', { name: 'D001 - Deed' }));
    expect(screen.getByRole('checkbox', { name: 'D001 - Deed' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    rerender(modal(false));
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
    rerender(modal(true));

    expect(await screen.findByRole('checkbox', { name: 'D001 - Deed' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
