import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { saveBlob } from '@/shared/utils/saveBlob';
import { useDownloadDocument, useViewDocument } from '@features/request/api/documents';
import type { BriefDocument } from '../api/appraisalBrief';

/**
 * The reason the credit officer opened this page.
 *
 * The two documents they file lead at full weight; every other file in the folder is listed
 * underneath at a quieter one. Nothing is hidden behind a request — access is the same for all
 * of them — the split is about what the eye should land on first.
 */
interface DocumentListProps {
  documents: BriefDocument[];
  released: boolean;
  /** Shown in the locked state so the reader knows why, not just that. */
  lockedReason: string;
}

const sizeLabel = (bytes: number | null) => {
  if (bytes == null) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * The glyph and tint for a file, from its actual extension.
 *
 * Every tile used to render a red `file-pdf` regardless — on the screenshot that put a PDF icon
 * on `appraisal_management.png`. The type is the one thing an icon here can usefully say, so it
 * has to be read off the name; and a lone red mark among teal controls was also the only warm
 * colour in the block, which is half of why the section did not hang together.
 */
const FILE_KINDS: { test: RegExp; icon: string; tint: string }[] = [
  { test: /\.pdf$/i, icon: 'file-pdf', tint: 'text-rose-600' },
  { test: /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i, icon: 'file-image', tint: 'text-sky-600' },
  { test: /\.(xlsx?|csv)$/i, icon: 'file-excel', tint: 'text-emerald-600' },
  { test: /\.docx?$/i, icon: 'file-word', tint: 'text-blue-600' },
  { test: /\.(zip|rar|7z)$/i, icon: 'file-zipper', tint: 'text-amber-600' },
];

const fileKind = (fileName: string | null) => {
  const match = fileName ? FILE_KINDS.find(k => k.test.test(fileName)) : undefined;
  return match ?? { icon: 'file-lines', tint: 'text-gray-500' };
};

const DocumentList = ({ documents, released, lockedReason }: DocumentListProps) => {
  const { t } = useTranslation('appraisal');
  const viewDocument = useViewDocument();
  const download = useDownloadDocument();

  /**
   * `mutateAsync`, NOT `mutate(id, { onSuccess })`.
   *
   * One mutation observer is shared by every row, and `MutationObserver.mutate` stores the
   * per-call callbacks in a single field and detaches the in-flight mutation before starting the
   * next — so downloading a second file before the first responded dropped the first blob on the
   * floor: no file, no toast, no error either. Chaining off the returned promise keeps each
   * click's continuation with that click. Nothing here needs `isPending`.
   */
  const save = (doc: BriefDocument) =>
    download
      .mutateAsync(doc.documentId)
      .then(({ blob, fileName }) =>
        saveBlob(blob, fileName ?? doc.fileName ?? `${doc.typeCode}.pdf`),
      )
      .catch(() => toast.error(t('activityTracking.brief.documents.downloadFailed')));

  if (!released) {
    return (
      /* Amber, matching the locked appraised value in the header — the same state, said twice
         on one screen, should not be grey in one place and amber in the other. */
      <div className="flex items-center gap-3.5 rounded-xl bg-amber-50/60 p-4 ring-1 ring-amber-200/70">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-white text-amber-600 shadow-sm">
          <Icon name="lock" style="solid" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <b className="block text-sm font-semibold text-amber-900">
            {t('activityTracking.brief.documents.lockedTitle')}
          </b>
          <p className="mt-0.5 text-xs text-amber-800/80">{lockedReason}</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500 ring-1 ring-gray-200">
        {t('activityTracking.brief.documents.empty')}
      </p>
    );
  }

  const primary = documents.filter(d => d.isPrimary);
  const rest = documents.filter(d => !d.isPrimary);

  return (
    <>
      <ul className="grid gap-3.5 sm:grid-cols-2">
        {primary.map(d => (
          <li key={d.documentId} className="flex items-center gap-4 rounded-[20px] bg-gray-50 p-5">
            <span className="grid h-[52px] w-[52px] flex-none place-items-center rounded-[17px] bg-white">
              <Icon
                name={fileKind(d.fileName).icon}
                style="solid"
                className={clsx('h-[22px] w-[22px]', fileKind(d.fileName).tint)}
              />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[15.5px] font-bold tracking-tight">
                {d.typeNameTh || d.typeName}
              </b>
              <span className="mt-1 block truncate text-[12.5px] text-gray-500">
                {[d.fileName, sizeLabel(d.fileSizeBytes)].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => viewDocument(d.documentId)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-gray-600 hover:text-teal-700"
                title={t('activityTracking.brief.documents.view')}
              >
                <Icon name="eye" style="solid" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => save(d)}
                className="inline-flex items-center gap-2 rounded-full bg-teal-800 px-5 py-3 text-[13.5px] font-bold text-teal-200 hover:bg-teal-900"
              >
                <Icon name="arrow-down-to-line" style="solid" className="h-4 w-4" />
                {t('activityTracking.brief.documents.download')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        /* Quieter than the two tiles above on purpose — these are the rest of the folder, not
           what credit came for. Small flat rows, borderless icon buttons that only pick up a
           tint on hover, so the pair of primary documents keeps the weight. */
        <div className="mt-5 border-t border-gray-200 pt-1">
          <div className="flex items-baseline gap-2.5 py-3">
            <b className="text-xs font-semibold text-gray-700">
              {t('activityTracking.brief.documents.others')}
            </b>
            <span className="text-[11px] text-gray-400">
              {t('activityTracking.brief.documents.othersHint', { count: rest.length })}
            </span>
          </div>
          {rest.map(d => (
            <div
              key={d.documentId}
              className="flex items-center gap-3.5 border-t border-gray-100 py-3"
            >
              <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-gray-50 ring-1 ring-gray-200">
                <Icon
                  name={fileKind(d.fileName).icon}
                  style="solid"
                  className={clsx('h-3.5 w-3.5', fileKind(d.fileName).tint)}
                />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-medium text-gray-900">
                  {d.typeNameTh || d.typeName}
                </b>
                <span className="block truncate text-[11px] text-gray-400">
                  {[d.typeCode, d.fileName, sizeLabel(d.fileSizeBytes)].filter(Boolean).join(' · ')}
                </span>
              </div>
              <div className="flex flex-none gap-1.5">
                <button
                  type="button"
                  onClick={() => viewDocument(d.documentId)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-primary"
                  title={t('activityTracking.brief.documents.view')}
                >
                  <Icon name="eye" style="solid" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => save(d)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-primary"
                  title={t('activityTracking.brief.documents.download')}
                >
                  <Icon name="arrow-down-to-line" style="solid" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default DocumentList;
