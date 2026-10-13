import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen, waitFor } from '@/test/test-utils';
import DocumentTypeModal from './DocumentTypeModal';
import type { DocumentTypeDto } from '../types';

const dontUse = () => screen.getByRole('radio', { name: /Don't use, attach a new one/ });
const use = () => screen.getByRole('radio', { name: /Use the file from the previous appraisal/ });

describe('DocumentTypeModal carry-forward default', () => {
  it('a new type starts on "don’t use" and is saved that way', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { user } = render(<DocumentTypeModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(dontUse()).toBeChecked();

    await user.type(screen.getByLabelText(/Code/), 'D099');
    await user.type(screen.getByLabelText(/^Name/), 'Test type');
    await user.click(screen.getByRole('button', { name: 'Add Document Type' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      code: 'D099',
      carryForwardByDefault: false,
    });
  });

  it('an existing type keeps the setting it has', () => {
    const editing: DocumentTypeDto = {
      id: 'x',
      code: 'D013',
      name: 'Deed',
      isActive: true,
      sortOrder: 1,
      carryForwardByDefault: true,
      isCarryForwardLocked: false,
    };
    render(<DocumentTypeModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} editing={editing} />);
    expect(use()).toBeChecked();
  });
});
