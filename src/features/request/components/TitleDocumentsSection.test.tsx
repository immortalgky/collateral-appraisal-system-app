import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { FormProvider, useForm, useFormState, type UseFormReturn } from 'react-hook-form';
import { hasDirtyFields } from '../utils/formDirty';
import toast from 'react-hot-toast';
import { render, screen, waitFor } from '@/test/test-utils';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import type { UploadedDocument } from '../types/document';
import { TitleDocumentsSection } from './DocumentUploader';

// The type names come from the rows' own displayName; the upload is a promise the test settles.
// "Add another document" offers the SUBMIT_DOC types; the rows themselves are named by displayName.
const submitTypes = vi.hoisted(() => [
  { code: 'D013', name: 'Deed type', isActive: true, sortOrder: 1 },
  { code: 'D015', name: 'ID card type', isActive: true, sortOrder: 2 },
]);
vi.mock('../api/documentTypes', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/documentTypes')>()),
  useGetDocumentTypes: (category?: string) => ({
    data: category === 'SUBMIT_DOC' ? submitTypes : [],
    isLoading: false,
  }),
}));
const upload = vi.hoisted(() => ({
  calls: [] as {
    file: File;
    resolve: (result: unknown) => void;
    reject: (error: unknown) => void;
  }[],
}));
vi.mock('../api/documents', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/documents')>()),
  useUploadDocument: () => ({
    mutateAsync: ({ file }: { file: File }) =>
      new Promise((resolve, reject) => {
        upload.calls.push({ file, resolve, reject });
      }),
  }),
}));

const doc = (over: Partial<UploadedDocument>): UploadedDocument => ({
  documentType: 'D013',
  fileName: null,
  uploadedAt: '2026-10-05T08:00:00',
  prefix: null,
  notes: null,
  filePath: null,
  createdWorkstation: null,
  isRequired: false,
  uploadedBy: 'maker',
  uploadedByName: 'Maker',
  ...over,
});

const titles = [
  {
    id: 'title-a',
    documents: [doc({ documentType: 'D013', isRequired: true, displayName: 'Deed A' })],
  },
  {
    id: 'title-b',
    documents: [
      doc({ documentType: 'D013', isRequired: true, displayName: 'Deed B' }),
      doc({ documentType: 'D014', displayName: 'Photo B', documentId: 'p1', fileName: 'b.png' }),
    ],
  },
];

let form: UseFormReturn<{ documents: UploadedDocument[]; titles: typeof titles }>;
/** Subscribes to dirtyFields (the form state only tracks what a render read). */
const DirtyProbe = () => (
  <output data-testid="dirty-fields">
    {String(hasDirtyFields(useFormState({ control: form.control }).dirtyFields))}
  </output>
);
function Harness({
  index,
  readOnly = false,
  show = true,
  session = async () => 'session',
}: {
  index: number;
  readOnly?: boolean;
  show?: boolean;
  session?: () => Promise<string>;
}) {
  form = useForm({ defaultValues: { documents: [] as UploadedDocument[], titles } });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...form}>
        <DirtyProbe />
        {show && (
          <TitleDocumentsSection
            index={index}
            heading="Documents of this title"
            getOrCreateSession={session}
          />
        )}
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

beforeEach(() => {
  upload.calls = [];
});

describe('the title editor documents section', () => {
  it('shows only its own title, with the count, and none of the card chrome', () => {
    render(<Harness index={1} />);
    expect(screen.getByRole('heading', { name: /Documents of this title/ })).toBeInTheDocument();
    expect(screen.getByText('Deed B')).toBeInTheDocument();
    expect(screen.queryByText('Deed A')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /b\.png/ })).toBeInTheDocument();
    // no toolbar, no side pane, no request section
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByText('Request level')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add a file to Deed B/ })).toBeInTheDocument();
  });

  it('offers no upload and no file input when read-only', () => {
    render(<Harness index={1} readOnly />);
    expect(screen.queryByRole('button', { name: /Add a file/ })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByRole('button', { name: /b\.png/ })).toBeInTheDocument();
  });

  it('takes the file into this title and settles the row once the upload is done', async () => {
    const { user } = render(<Harness index={0} />);
    await user.click(screen.getByRole('button', { name: /Add a file to Deed A/ }));
    const input = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].at(-1)!;
    const file = new File(['%PDF'], 'deed-a.pdf', { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(form.getValues('titles.0.documents').some(d => d.isUploading)).toBe(true);
    expect(form.getValues('titles.1.documents')).toHaveLength(2); // the other title is untouched
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () => upload.calls[0].resolve({ documentId: 'doc-1', fileName: 'deed-a.pdf' }));
    await waitFor(() =>
      expect(form.getValues('titles.0.documents')).toEqual([
        expect.objectContaining({
          documentId: 'doc-1',
          fileName: 'deed-a.pdf',
          isUploading: false,
        }),
      ]),
    );
  });

  it('still settles the row when the section is gone before the upload ends', async () => {
    const { user, rerender } = render(<Harness index={0} />);
    await user.click(screen.getByRole('button', { name: /Add a file to Deed A/ }));
    const input = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].at(-1)!;
    const file = new File(['%PDF'], 'deed-a.pdf', { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(form.getValues('titles.0.documents').some(d => d.isUploading)).toBe(true);
    rerender(<Harness index={0} show={false} />);
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () => upload.calls[0].resolve({ documentId: 'doc-1', fileName: 'deed-a.pdf' }));
    await waitFor(() =>
      expect(form.getValues('titles.0.documents')).toEqual([
        expect.objectContaining({ documentId: 'doc-1', isUploading: false }),
      ]),
    );
  });
  describe('several files picked at once', () => {
    const pick = async (names: string[]) => {
      const { user } = render(<Harness index={0} />);
      await user.click(screen.getByRole('button', { name: /Add a file to Deed A/ }));
      const input = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].at(-1)!;
      expect(input.multiple).toBe(true);
      const files = names.map(name => new File(['%PDF'], name, { type: 'application/pdf' }));
      await act(async () => {
        fireEvent.change(input, { target: { files } });
      });
    };
    const rows = () => form.getValues('titles.0.documents').filter(d => d.fileName);

    it('makes one row per file, all of this type, and every one ends with a documentId', async () => {
      await pick(['a.pdf', 'b.pdf', 'c.pdf']);
      expect(rows()).toHaveLength(3);
      expect(rows().every(d => d.isUploading && d.documentType === 'D013')).toBe(true);
      await waitFor(() => expect(upload.calls).toHaveLength(3));
      await act(async () => {
        upload.calls.forEach((call, i) =>
          call.resolve({ documentId: `doc-${i}`, fileName: call.file.name }),
        );
      });
      await waitFor(() => expect(rows().every(d => !d.isUploading)).toBe(true));
      expect(rows().map(d => d.documentId)).toEqual(['doc-0', 'doc-1', 'doc-2']);
      expect(rows().map(d => d.fileName)).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
    });

    it('leaves the other files done when one fails', async () => {
      await pick(['a.pdf', 'b.pdf', 'c.pdf']);
      await waitFor(() => expect(upload.calls).toHaveLength(3));
      await act(async () => {
        upload.calls[0].resolve({ documentId: 'doc-0', fileName: 'a.pdf' });
        upload.calls[1].reject(Object.assign(new Error('boom'), { apiError: { detail: 'boom' } }));
        upload.calls[2].resolve({ documentId: 'doc-2', fileName: 'c.pdf' });
      });
      await waitFor(() => expect(rows().every(d => !d.isUploading)).toBe(true));
      expect(rows().map(d => d.documentId)).toEqual(['doc-0', 'doc-2']);
    });

    it('sends three at a time and starts the next as one finishes', async () => {
      await pick(['1.pdf', '2.pdf', '3.pdf', '4.pdf', '5.pdf']);
      await waitFor(() => expect(upload.calls).toHaveLength(3));
      expect(rows()).toHaveLength(5);
      await act(async () => upload.calls[0].resolve({ documentId: 'd1', fileName: '1.pdf' }));
      await waitFor(() => expect(upload.calls).toHaveLength(4));
    });

    it('skips what cannot go up and names it in one message', async () => {
      const { user } = render(<Harness index={0} />);
      await user.click(screen.getByRole('button', { name: /Add a file to Deed A/ }));
      const input = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].at(-1)!;
      const files = [
        new File(['%PDF'], 'ok.pdf', { type: 'application/pdf' }),
        new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' }),
      ];
      await act(async () => {
        fireEvent.change(input, { target: { files } });
      });
      await waitFor(() => expect(upload.calls).toHaveLength(1));
      expect(upload.calls[0].file.name).toBe('ok.pdf');
      expect(rows()).toHaveLength(1);
    });
  });
});

describe('adding another document to the title', () => {
  const chooseType = async (user: ReturnType<typeof render>['user'], name: RegExp) => {
    await user.click(screen.getByRole('button', { name: /Add another document/ }));
    await user.click(await screen.findByRole('button', { name: /Select type/ }));
    await user.click(await screen.findByRole('option', { name }));
  };
  const pickFile = async (user: ReturnType<typeof render>['user'], name = 'extra.pdf') => {
    await user.click(screen.getByRole('button', { name: 'Choose files' }));
    const input = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].at(-1)!;
    const file = new File(['%PDF'], name, { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
  };

  it('is offered while editing, not when read-only', () => {
    const { unmount } = render(<Harness index={0} />);
    expect(screen.getByRole('button', { name: /Add another document/ })).toBeInTheDocument();
    unmount();
    render(<Harness index={0} readOnly />);
    expect(screen.queryByRole('button', { name: /Add another document/ })).not.toBeInTheDocument();
  });

  it('asks for a type from the attach-documents list, and needs one before it goes on', async () => {
    const { user } = render(<Harness index={0} />);
    await user.click(screen.getByRole('button', { name: /Add another document/ }));
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeDisabled();
    await user.click(await screen.findByRole('button', { name: /Select type/ }));
    expect(await screen.findByRole('option', { name: /Deed type/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ID card type/ })).toBeInTheDocument();
  });

  it('puts the file on this title under that type as a row that is not required', async () => {
    const { user } = render(<Harness index={0} />);
    await chooseType(user, /ID card type/);
    await pickFile(user);
    const added = form.getValues('titles.0.documents').filter(d => d.fileName);
    expect(added).toEqual([
      expect.objectContaining({
        documentType: 'D015',
        fileName: 'extra.pdf',
        isRequired: false,
        titleId: 'title-a',
        isUploading: true,
      }),
    ]);
    // the required deed row is still there, empty, and the other title is untouched
    expect(
      form.getValues('titles.0.documents').some(d => d.documentType === 'D013' && !d.fileName),
    ).toBe(true);
    expect(form.getValues('titles.1.documents')).toHaveLength(2);
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    expect(upload.calls[0].file.name).toBe('extra.pdf');
  });

  it('fills the empty slot of a type the title is already asked for, instead of adding beside it', async () => {
    const { user } = render(<Harness index={0} />);
    await chooseType(user, /Deed type/);
    await pickFile(user, 'deed.pdf');
    const docs = form.getValues('titles.0.documents');
    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual(
      expect.objectContaining({ documentType: 'D013', fileName: 'deed.pdf', isRequired: true }),
    );
  });
});

describe('replacing a file of the title', () => {
  const replaceWith = async (user: ReturnType<typeof render>['user'], name: string) => {
    await user.click(screen.getByRole('button', { name: 'File actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Replace file' }));
    // the replace input comes before the upload input
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['%PDF'], name, { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
  };
  const photo = () => form.getValues('titles.1.documents').find(d => d.documentType === 'D014')!;

  it("shows the new file as uploading on the same row, then settles it as the maker's own", async () => {
    const { user } = render(<Harness index={1} />);
    await replaceWith(user, 'new-b.pdf');
    expect(photo()).toEqual(
      expect.objectContaining({ fileName: 'new-b.pdf', isUploading: true, source: 'REQUEST' }),
    );
    expect(form.getValues('titles.1.documents')).toHaveLength(2);
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () =>
      upload.calls[0].resolve({ documentId: 'doc-new', fileName: 'new-b.pdf' }),
    );
    await waitFor(() =>
      expect(photo()).toEqual(
        expect.objectContaining({
          documentId: 'doc-new',
          isUploading: false,
          fileName: 'new-b.pdf',
        }),
      ),
    );
  });

  it('uploads nothing, and says so, when the row is gone by the time the file is chosen', async () => {
    const error = vi.spyOn(toast, 'error');
    try {
      const { user } = render(<Harness index={1} />);
      await user.click(screen.getByRole('button', { name: 'File actions' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Replace file' }));
      // the file is deleted while the picker is open
      act(() =>
        form.setValue(
          'titles.1.documents',
          form.getValues('titles.1.documents').filter(d => d.documentType !== 'D014'),
        ),
      );
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['%PDF'], 'new-b.pdf', { type: 'application/pdf' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });
      expect(error).toHaveBeenCalledWith('Replace failed. Please try again.');
      expect(upload.calls).toHaveLength(0);
      // nothing was added in its place
      expect(form.getValues('titles.1.documents').map(d => d.documentType)).toEqual(['D013']);
    } finally {
      error.mockRestore();
    }
  });

  it('puts the old file back, and says the session failed, when no upload session can be made', async () => {
    const error = vi.spyOn(toast, 'error');
    try {
      const { user } = render(
        <Harness
          index={1}
          session={async () => {
            throw new Error('no session');
          }}
        />,
      );
      await replaceWith(user, 'new-b.pdf');
      await waitFor(() =>
        expect(error).toHaveBeenCalledWith('Failed to create upload session. Please try again.'),
      );
      expect(photo()).toEqual(expect.objectContaining({ fileName: 'b.png', documentId: 'p1' }));
      expect(photo().isUploading).toBeFalsy();
      expect(upload.calls).toHaveLength(0);
    } finally {
      error.mockRestore();
    }
  });

  it('refuses a file the system does not take, with the same message as a pick, and changes nothing', async () => {
    const error = vi.spyOn(toast, 'error');
    try {
      const { user } = render(<Harness index={1} />);
      await user.click(screen.getByRole('button', { name: 'File actions' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Replace file' }));
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      const exe = new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [exe] } });
      });
      expect(error).toHaveBeenCalledWith(expect.stringContaining('virus.exe'));
      expect(photo()).toEqual(expect.objectContaining({ fileName: 'b.png', documentId: 'p1' }));
      expect(photo().isUploading).toBeFalsy();
      expect(upload.calls).toHaveLength(0);
    } finally {
      error.mockRestore();
    }
  });

  it("keeps the row's key while it is replaced, so a selected file stays selected", async () => {
    const { user } = render(<Harness index={1} />);
    const before = photo().rowId ?? photo().id ?? photo().documentId;
    await replaceWith(user, 'new-b.pdf');
    expect(photo().isUploading).toBe(true);
    expect(photo().rowId).toBe(before);
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () =>
      upload.calls[0].resolve({ documentId: 'doc-new', fileName: 'new-b.pdf' }),
    );
    await waitFor(() => expect(photo().isUploading).toBe(false));
    expect(photo().rowId).toBe(before);
  });

  it('leaves the form as clean as it was when the replace fails, and dirty when it succeeds', async () => {
    const dirty = () => screen.getByTestId('dirty-fields');
    const { user, unmount } = render(<Harness index={1} />);
    await replaceWith(user, 'new-b.pdf');
    // on its way: nothing the maker changed yet
    expect(dirty()).toHaveTextContent('false');
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () =>
      upload.calls[0].reject(Object.assign(new Error('boom'), { apiError: { detail: 'boom' } })),
    );
    await waitFor(() => expect(photo().fileName).toBe('b.png'));
    expect(dirty()).toHaveTextContent('false');
    unmount();

    upload.calls = [];
    const again = render(<Harness index={1} />);
    await replaceWith(again.user, 'new-b.pdf');
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () =>
      upload.calls[0].resolve({ documentId: 'doc-new', fileName: 'new-b.pdf' }),
    );
    await waitFor(() => expect(dirty()).toHaveTextContent('true'));
  });

  it('puts the old file back when the upload fails', async () => {
    const { user } = render(<Harness index={1} />);
    await replaceWith(user, 'new-b.pdf');
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () =>
      upload.calls[0].reject(Object.assign(new Error('boom'), { apiError: { detail: 'boom' } })),
    );
    await waitFor(() =>
      expect(photo()).toEqual(expect.objectContaining({ fileName: 'b.png', documentId: 'p1' })),
    );
  });
});

describe('a failed upload into the title leaves the form as clean as it was', () => {
  it('whether the file or the session fails, and a success marks the form dirty', async () => {
    const dirty = () => screen.getByTestId('dirty-fields');
    const pickInto = async (user: ReturnType<typeof render>['user']) => {
      await user.click(screen.getByRole('button', { name: /Add a file to Deed A/ }));
      const input = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].at(-1)!;
      const file = new File(['%PDF'], 'deed-a.pdf', { type: 'application/pdf' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });
    };

    const first = render(<Harness index={0} />);
    await pickInto(first.user);
    expect(dirty()).toHaveTextContent('false'); // on its way
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () => upload.calls[0].reject(new Error('boom')));
    await waitFor(() =>
      expect(form.getValues('titles.0.documents').some(d => d.fileName)).toBe(false),
    );
    expect(dirty()).toHaveTextContent('false');
    first.unmount();

    upload.calls = [];
    const second = render(
      <Harness
        index={0}
        session={async () => {
          throw new Error('no session');
        }}
      />,
    );
    await pickInto(second.user);
    await waitFor(() =>
      expect(form.getValues('titles.0.documents').some(d => d.fileName)).toBe(false),
    );
    expect(dirty()).toHaveTextContent('false');
    second.unmount();

    upload.calls = [];
    const third = render(<Harness index={0} />);
    await pickInto(third.user);
    await waitFor(() => expect(upload.calls).toHaveLength(1));
    await act(async () => upload.calls[0].resolve({ documentId: 'doc-1', fileName: 'deed-a.pdf' }));
    await waitFor(() => expect(dirty()).toHaveTextContent('true'));
  });
});
