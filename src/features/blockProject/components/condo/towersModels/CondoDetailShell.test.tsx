import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { useForm, type FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { useUIStore } from '@shared/store';
import { render, screen, within } from '@/test/test-utils';
import type { Photo } from '@/features/appraisal/components/PhotoGallery';
import type { PhotoSectionView } from '@/features/appraisal/components/PropertyPhotoSection';
import { FormSection, FormSheet } from '@/shared/components/form';
import { CondoDetailShell } from './CondoDetailShell';

const photo = (id: string): Photo => ({
  id,
  documentId: null,
  fileName: `${id}.jpg`,
  url: `/${id}.jpg`,
});

const view = (over: Partial<PhotoSectionView> = {}): PhotoSectionView => ({
  photos: [],
  thumbnailId: null,
  readOnly: false,
  onAdd: vi.fn(),
  onPreview: vi.fn(),
  ...over,
});

/** The shell's own width reading: `useCardIsWide` takes it from a ResizeObserver entry. */
const setWidth = (width: number) =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: (entries: { contentRect: { width: number } }[]) => void;
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
        this.callback = callback;
      }
      observe() {
        this.callback([{ contentRect: { width } }]);
      }
      disconnect() {}
    },
  );

// The photo section, reduced to what the shell needs from it: it hands the view to `renderGallery`.
const Harness = ({ photoView }: { photoView: PhotoSectionView }) => {
  const methods = useForm<FieldValues>();
  return (
    <CondoDetailShell
      methods={methods}
      schema={z.object({}) as unknown as z.ZodType<FieldValues>}
      onSubmit={e => e.preventDefault()}
      photos={renderGallery => renderGallery(photoView)}
      footer={null}
    >
      <FormSheet>
        <FormSection title="Information" icon="building">
          <input aria-label="form body" />
        </FormSection>
      </FormSheet>
    </CondoDetailShell>
  );
};

describe('CondoDetailShell', () => {
  // A Block page has one look: whatever the user's global form-layout setting, it is the standard one.
  beforeEach(() => useUIStore.setState({ formLayout: 'grid' }));
  afterEach(() => vi.unstubAllGlobals());

  describe('wide: the photo card beside the sheet', () => {
    // The card's own behaviour is covered by PhotoAside.test.tsx.
    it('draws the shared photo card and the section TOC in the rail beside the sheet', async () => {
      render(<Harness photoView={view({ photos: [photo('a'), photo('b')], thumbnailId: 'b' })} />);

      const card = await screen.findByRole('complementary', { name: 'Photos' });
      expect(screen.getByLabelText('form body')).toBeInTheDocument();
      expect(within(card).getByText('Cover')).toBeInTheDocument();
      const toc = await screen.findByRole('navigation', { name: 'On this page' });
      expect(within(toc).getByRole('link', { name: /^Information/ })).toBeInTheDocument();
    });
  });

  describe('narrow: the photo strip leads the form', () => {
    it('puts the Photos section before the form, with no side card and no TOC', async () => {
      setWidth(600);
      render(<Harness photoView={view({ photos: [photo('a')] })} />);

      expect(screen.queryByRole('complementary')).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
      const photos = await screen.findByRole('region', { name: 'Photos' });
      const info = screen.getByRole('region', { name: 'Information' });
      expect(within(photos).getByRole('heading', { name: 'Photos' })).toBeInTheDocument();
      // The strip, with its add tile, is in that section.
      expect(within(photos).getByText('Click to add picture')).toBeInTheDocument();
      expect(info).toContainElement(screen.getByLabelText('form body'));
      expect(photos.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
