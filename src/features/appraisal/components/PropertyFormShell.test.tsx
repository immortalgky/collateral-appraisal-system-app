import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import { FormSection, FormSheet } from '@/shared/components/form';
import { PropertyFormShell } from './PropertyFormShell';

// The photo section and the header have their own tests and need the API / a form; the shell only
// decides where the photos go and what the rail lists.
vi.mock('./PropertyPhotoSection', async () => {
  const { forwardRef } = await import('react');
  const photo = (id: string) => ({
    id,
    documentId: null,
    fileName: `${id}.jpg`,
    url: `/${id}.jpg`,
  });
  return {
    default: forwardRef(({ renderGallery }: { renderGallery: (view: unknown) => ReactNode }) => (
      <>
        {renderGallery({
          photos: [photo('a'), photo('b')],
          thumbnailId: 'a',
          readOnly: false,
          onAdd: vi.fn(),
          onPreview: vi.fn(),
          onDelete: vi.fn(),
          onSetThumbnail: vi.fn(),
        })}
      </>
    )),
  };
});
vi.mock('./PropertyEditorHeader', () => ({
  PropertyEditorHeader: () => <div data-testid="header" />,
}));

/** The shell's own width reading: `useCardIsWide` takes it from a ResizeObserver entry. */
const setWidth = (width: number) =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
    },
  );

const Shell = ({ photos = true }: { photos?: boolean }) => (
  <PropertyFormShell
    appraisalId="appraisal-1"
    typeCode="L"
    photoSectionRef={photos ? { current: null } : undefined}
    tabs={[{ id: 'land', label: 'Land' }]}
    activeTab="land"
  >
    <FormSheet>
      <FormSection title="Title deeds" id="deeds">
        <input aria-label="deed" />
      </FormSection>
      <FormSection title="Land details" id="details">
        <input aria-label="detail" />
      </FormSection>
      <div className="hidden">
        <FormSection title="Lease terms" id="lease">
          <input aria-label="lease" />
        </FormSection>
      </div>
    </FormSheet>
  </PropertyFormShell>
);

describe('PropertyFormShell', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('wide', () => {
    it('puts the photo card and the section TOC in the rail, and no strip', async () => {
      setWidth(1600);
      render(<Shell />);

      const card = await screen.findByRole('complementary', { name: 'Photos' });
      expect(within(card).getByText('Cover')).toBeInTheDocument();
      // The TOC lists the sections of the tab being shown, in page order.
      const toc = await screen.findByRole('navigation', { name: 'On this page' });
      expect(
        within(toc)
          .getAllByRole('link')
          .map(a => a.textContent),
      ).toEqual(['Title deeds', 'Land details']);
      expect(within(toc).getByRole('link', { name: 'Title deeds' })).toHaveAttribute(
        'href',
        '#deeds',
      );
      // The photos are not also a section of the form.
      expect(screen.queryByRole('heading', { name: 'Photos' })).toBeNull();
    });

    it('carries the container class the table kit and FormSection measure', () => {
      setWidth(1600);
      const { container } = render(<Shell />);
      expect(container.querySelector('[class~="@container/form-shell"]')).not.toBeNull();
      expect(container.querySelector('#form-scroll-container')).not.toBeNull();
    });

    it('has no photo card for a form without photos (PMA), but keeps the TOC', async () => {
      setWidth(1600);
      render(<Shell photos={false} />);
      expect(await screen.findByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
      expect(screen.queryByRole('complementary')).toBeNull();
    });
  });

  describe('narrow', () => {
    it('has no rail and no TOC; the photo strip is the first section of the form', async () => {
      setWidth(800);
      render(<Shell />);

      expect(screen.queryByRole('complementary')).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
      const heading = await screen.findByRole('heading', { name: 'Photos' });
      expect(screen.getByText('Click to add picture')).toBeInTheDocument();
      // Before the form's own first section.
      expect(
        heading.compareDocumentPosition(screen.getByRole('heading', { name: 'Title deeds' })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('has no photo section for a form without photos (PMA)', () => {
      setWidth(800);
      render(<Shell photos={false} />);
      expect(screen.queryByRole('heading', { name: 'Photos' })).toBeNull();
    });
  });
});
