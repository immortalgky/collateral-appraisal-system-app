import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import toast from 'react-hot-toast';
import { render, screen, waitFor } from '@/test/test-utils';
import { uploadForm } from '@shared/api/blobTransfer';
import type { UnitPriceImportPreview } from '../types';
import UnitPriceImportDialog from './UnitPriceImportDialog';

// No network: the shared transfer helper is the only thing the hooks reach for.
vi.mock('@shared/api/blobTransfer', () => ({ uploadForm: vi.fn(), downloadBlob: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const preview = (over: Partial<UnitPriceImportPreview> = {}): UnitPriceImportPreview => ({
  fileName: 'prices.xlsx',
  projectType: 'Condo',
  rowCount: 3,
  matchedCount: 3,
  matchedByPrimaryKey: 2,
  matchedBySecondaryKey: 1,
  unitsInProject: 3,
  errors: [],
  attributeDiffs: [],
  unitsMissingFromFile: [],
  rows: [
    {
      rowNumber: 2,
      key: '15A01',
      projectUnitId: 'u1',
      previousAppraisalValue: 1_000_000,
      newAppraisalValue: 1_200_000,
    },
  ],
  totals: { appraisalValue: 3_600_000, forceSellingPrice: 2_880_000, coverageAmount: 900_000 },
  sheetTotals: { appraisalValue: 3_600_000, forceSellingPrice: null, coverageAmount: null },
  sheetTotalsMatch: true,
  canImport: true,
  ...over,
});

const file = () =>
  new File(['x'], 'prices.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

const setup = async (result: UnitPriceImportPreview) => {
  vi.mocked(uploadForm).mockResolvedValue({ data: result } as never);
  const onClose = vi.fn();
  const onImported = vi.fn();
  const view = render(
    <UnitPriceImportDialog appraisalId="a1" onClose={onClose} onImported={onImported} />,
  );
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await view.user.upload(input, file());
  return { ...view, onClose, onImported };
};

const confirmButton = () => screen.getByRole('button', { name: /Import prices for/ });

describe('UnitPriceImportDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('previews the chosen file without importing it, and enables the confirm button', async () => {
    await setup(preview());

    await waitFor(() => expect(confirmButton()).toBeEnabled());
    expect(confirmButton()).toHaveTextContent('Import prices for 3 units');
    expect(uploadForm).toHaveBeenCalledTimes(1);
    expect(vi.mocked(uploadForm).mock.calls[0][0]).toBe(
      '/appraisals/a1/project/unit-prices/import/preview',
    );
    expect(screen.getByText('Matches the totals row in the file')).toBeInTheDocument();
  });

  it('blocks the import and lists the translated errors when the file has blocking errors', async () => {
    await setup(
      preview({
        canImport: false,
        errors: [{ rowNumber: 5, key: '99Z', code: 'UnitNotFound', message: 'raw server text' }],
      }),
    );

    await waitFor(() => expect(confirmButton()).toBeDisabled());
    // The translated label, then the server's own message.
    expect(
      screen.getByText('This unit was not found in the system — raw server text'),
    ).toBeInTheDocument();
  });

  it('says why nothing can be imported when there are no row errors but nothing matched', async () => {
    await setup(
      preview({
        canImport: false,
        matchedCount: 0,
        matchedByPrimaryKey: 0,
        matchedBySecondaryKey: 0,
      }),
    );

    expect(
      await screen.findByText(
        'The file has no priced unit that matches this project, so nothing can be imported.',
      ),
    ).toBeInTheDocument();
    // The errors tile must not say "Passed" as if the import could go ahead; only the
    // missing-units tile (genuinely clean) does.
    expect(screen.getAllByText('Passed')).toHaveLength(1);
    expect(screen.getByText('Fix the file')).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it('keeps each server message next to the label, so two MissingHeader errors can be told apart', async () => {
    await setup(
      preview({
        canImport: false,
        errors: [
          {
            rowNumber: 1,
            key: null,
            code: 'MissingHeader',
            message: "Column 'ราคามาตรฐาน' not found",
          },
          {
            rowNumber: 1,
            key: null,
            code: 'MissingHeader',
            message: "Column 'มูลค่าประเมิน' not found",
          },
        ],
      }),
    );

    expect(
      await screen.findByText(
        "A required column header is missing from the file — Column 'ราคามาตรฐาน' not found",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A required column header is missing from the file — Column 'มูลค่าประเมิน' not found",
      ),
    ).toBeInTheDocument();
  });

  it('falls back to the server message for an unknown error code', async () => {
    await setup(
      preview({
        canImport: false,
        errors: [{ rowNumber: 5, key: null, code: 'SomethingNew', message: 'raw server text' }],
      }),
    );

    expect(await screen.findByText('raw server text')).toBeInTheDocument();
  });

  it('warns about units missing from the file and shows reported-only diffs', async () => {
    await setup(
      preview({
        unitsMissingFromFile: [{ projectUnitId: 'u9', key: '08A05' }],
        attributeDiffs: [
          { rowNumber: 2, key: '15A01', column: 'ชั้นที่', systemValue: '15', fileValue: '16' },
        ],
      }),
    );

    // One of each: the singular forms ("1 unit has", not "1 units have").
    expect(
      await screen.findByText(/^1 unit has no price in the file .* Its price will be cleared/),
    ).toBeInTheDocument();
    expect(screen.getByText('08A05')).toBeInTheDocument();
    expect(
      screen.getByText(/^1 unit detail differs .* it does not block the import/),
    ).toBeInTheDocument();
  });

  it('uses the plural forms for several, and shows money with two decimals', async () => {
    await setup(
      preview({
        errors: [
          { rowNumber: 5, key: 'a', code: 'UnitNotFound', message: 'x' },
          { rowNumber: 6, key: 'b', code: 'UnitNotFound', message: 'y' },
        ],
        canImport: false,
        unitsMissingFromFile: [
          { projectUnitId: 'u8', key: '08A04' },
          { projectUnitId: 'u9', key: '08A05' },
        ],
        rows: [
          {
            rowNumber: 2,
            key: '15A01',
            projectUnitId: 'u1',
            previousAppraisalValue: 1_000_000,
            newAppraisalValue: 2_699_998.4,
          },
        ],
      }),
    );

    expect(await screen.findByText(/^2 errors found/)).toBeInTheDocument();
    expect(screen.getByText(/^2 units have no price in the file/)).toBeInTheDocument();
    expect(screen.getByText('Sample of changes (first 1 row)')).toBeInTheDocument();
    expect(screen.getByText('2,699,998.40')).toBeInTheDocument();
  });

  it('imports the same file on confirm and closes', async () => {
    const { user, onClose, onImported } = await setup(preview());
    await waitFor(() => expect(confirmButton()).toBeEnabled());

    // The server wrote 2 units even though the preview promised 3: the toast reports what was written.
    vi.mocked(uploadForm).mockResolvedValue({ data: preview({ matchedCount: 2 }) } as never);
    await user.click(confirmButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onImported).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Imported prices for 2 units');
    const [url, body] = vi.mocked(uploadForm).mock.calls[1];
    expect(url).toBe('/appraisals/a1/project/unit-prices/import');
    expect((body as FormData).get('file')).toBeInstanceOf(File);
    expect(((body as FormData).get('file') as File).name).toBe('prices.xlsx');
  });

  it('says which totals differ from the file, and shows the file value on that tile only', async () => {
    await setup(
      preview({
        totals: {
          appraisalValue: 3_600_000,
          forceSellingPrice: 2_880_000,
          coverageAmount: 900_000,
        },
        sheetTotals: {
          appraisalValue: 3_600_000.5, // within a baht: matches
          forceSellingPrice: 2_900_000, // differs
          coverageAmount: null, // the file has no insurance total
        },
        sheetTotalsMatch: false,
      }),
    );

    expect(await screen.findByText('Total forced-sale price')).toBeInTheDocument();
    expect(screen.getAllByText('Matches the totals row in the file')).toHaveLength(1);
    expect(
      screen.getAllByText('Differs from the totals row in the file (file says 2,900,000.00)'),
    ).toHaveLength(1);
    expect(screen.getAllByText("Not in the file's totals row")).toHaveLength(1);
    expect(screen.queryByText(/\(-\)/)).toBeNull();
  });

  it('shows no fire-insurance total for a Land project', async () => {
    await setup(preview({ projectType: 'Land' }));

    expect(await screen.findByText('Total forced-sale price')).toBeInTheDocument();
    expect(screen.queryByText('Total fire-insurance value')).toBeNull();
  });

  it('shows the fire-insurance total for a Land and Building project', async () => {
    await setup(preview({ projectType: 'LandAndBuilding' }));

    expect(await screen.findByText('Total fire-insurance value')).toBeInTheDocument();
  });

  it('lists at most 50 missing units and diffs, then says how many more', async () => {
    await setup(
      preview({
        unitsMissingFromFile: Array.from({ length: 60 }, (_, i) => ({
          projectUnitId: `m${i}`,
          key: `M${i}`,
        })),
        attributeDiffs: Array.from({ length: 55 }, (_, i) => ({
          rowNumber: i + 2,
          key: `D${i}`,
          column: 'ชั้นที่',
          systemValue: '1',
          fileValue: '2',
        })),
      }),
    );

    expect(await screen.findByText('M49')).toBeInTheDocument();
    expect(screen.queryByText('M50')).toBeNull();
    expect(screen.queryByText('D50')).toBeNull();
    expect(screen.getByText('+10 more')).toBeInTheDocument();
    expect(screen.getByText('+5 more')).toBeInTheDocument();
  });

  it('translates the MissingPrice error code', async () => {
    await setup(
      preview({
        canImport: false,
        errors: [{ rowNumber: 4, key: '15A01', code: 'MissingPrice', message: 'raw' }],
      }),
    );

    expect(await screen.findByText(/forced-sale price is blank/)).toBeInTheDocument();
  });

  it('re-runs the preview with the same file when the server rejects an import with 400', async () => {
    const { user } = await setup(preview());
    await waitFor(() => expect(confirmButton()).toBeEnabled());

    const rejected = {
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Blocking errors in the file' } },
    };
    vi.mocked(uploadForm)
      .mockRejectedValueOnce(rejected)
      .mockResolvedValueOnce({
        data: preview({
          canImport: false,
          errors: [{ rowNumber: 3, key: '99Z', code: 'UnitNotFound', message: 'x' }],
        }),
      } as never);
    await user.click(confirmButton());

    await waitFor(() => expect(confirmButton()).toBeDisabled());
    expect(toast.error).toHaveBeenCalledWith('Blocking errors in the file');
    expect(uploadForm).toHaveBeenCalledTimes(3); // preview, import (rejected), preview again
    const urls = vi.mocked(uploadForm).mock.calls.map(c => c[0]);
    expect(urls[2]).toBe('/appraisals/a1/project/unit-prices/import/preview');
    expect(screen.getByText(/This unit was not found in the system/)).toBeInTheDocument();
  });

  it('keeps the file and the last result, with one toast, when the re-check after a 400 fails too', async () => {
    const { user } = await setup(preview());
    await waitFor(() => expect(confirmButton()).toBeEnabled());

    vi.mocked(toast.error).mockClear();
    vi.mocked(uploadForm)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 400, data: { detail: 'Blocking errors in the file' } },
      })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: {} } });
    await user.click(confirmButton());

    await waitFor(() => expect(uploadForm).toHaveBeenCalledTimes(3));
    // The import's error is the only toast; the failed re-check says nothing of its own.
    await waitFor(() => expect(confirmButton()).toBeEnabled());
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Blocking errors in the file');
    // The chosen file and the earlier result are still there: the dialog was not reset.
    expect(screen.getByText('prices.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Matches the totals row in the file')).toBeInTheDocument();
  });

  it('restarts the preview when another file is chosen', async () => {
    const { user } = await setup(preview({ canImport: false }));
    await waitFor(() => expect(confirmButton()).toBeDisabled());

    vi.mocked(uploadForm).mockResolvedValue({ data: preview() } as never);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file());

    await waitFor(() => expect(confirmButton()).toBeEnabled());
    expect(uploadForm).toHaveBeenCalledTimes(2);
  });
});
