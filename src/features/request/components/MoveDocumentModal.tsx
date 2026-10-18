import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/inputs';
import FileBadgeIcon from './documentCard/FileBadgeIcon';

export interface MoveTargetSection {
  entityType: 'request' | 'title';
  entityIndex: number;
  label: string;
  /** A muted line under the label: where the title is, who owns it, or what request level means. */
  detail?: string;
  /** The title this file came from (same collateral type and number). */
  matches?: boolean;
}

/** The file being placed, shown under the title so the maker knows which one this is. */
export interface MoveFileInfo {
  fileName: string;
  /** The document type, code and name. */
  typeLabel?: string;
  /** Where it came from, e.g. "from the previous appraisal 6910…". */
  fromLabel?: string;
}

interface MoveDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Selectable destinations (current section already excluded by the caller). */
  targets: MoveTargetSection[];
  /** `documentType` is the chosen code when `types` is given, else undefined. */
  onConfirm: (target: MoveTargetSection, documentType?: string) => void;
  /** The section chosen at the start; without it, the one title marked `matches`. */
  defaultTarget?: { entityType: 'request' | 'title'; entityIndex: number } | null;
  /** Document types to pick from; given, the maker picks the type as well as the section. */
  types?: { code: string; label: string }[];
  defaultType?: string;
  file?: MoveFileInfo;
  /** Overrides for other uses of the same chooser; the defaults say "Move Document". */
  title?: string;
  description?: string;
  confirmText?: string;
}

/** The search box appears once the list is long enough to need it. */
const SEARCH_FROM = 7;

const sectionKey = (s: MoveTargetSection) => `${s.entityType}|${s.entityIndex}`;

const MoveDocumentModal: React.FunctionComponent<MoveDocumentModalProps> = ({
  isOpen,
  onClose,
  targets,
  onConfirm,
  defaultTarget,
  types,
  defaultType,
  file,
  title,
  description,
  confirmText,
}) => {
  const { t } = useTranslation(['request', 'common']);
  // Exactly one title that is the file's own is chosen at the start; several prove nothing.
  const initial = useMemo(() => {
    if (defaultTarget) {
      const given = targets.find(
        s =>
          s.entityType === defaultTarget.entityType && s.entityIndex === defaultTarget.entityIndex,
      );
      if (given) return sectionKey(given);
    }
    const own = targets.filter(s => s.matches);
    return own.length === 1 ? sectionKey(own[0]) : null;
  }, [targets, defaultTarget]);
  const [documentType, setDocumentType] = useState(defaultType ?? '');
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const selectedKey = chosen === undefined ? initial : chosen;
  const [query, setQuery] = useState('');

  const searchable = targets.length >= SEARCH_FROM;
  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      needle
        ? targets.filter(s => `${s.label} ${s.detail ?? ''}`.toLowerCase().includes(needle))
        : targets,
    [targets, needle],
  );

  const handleConfirm = () => {
    const target = targets.find(s => sectionKey(s) === selectedKey);
    if (!target) return;
    if (types) onConfirm(target, documentType);
    else onConfirm(target);
  };

  const handleClose = () => {
    setChosen(undefined);
    setQuery('');
    setDocumentType(defaultType ?? '');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title ?? t('moveDocument.modalTitle')}
      size="md"
      compact
    >
      <div className="flex flex-col gap-3">
        {file && (
          <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2">
            <FileBadgeIcon fileName={file.fileName} />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-xs font-medium text-gray-900" title={file.fileName}>
                {file.fileName}
              </p>
              {file.typeLabel && (
                <p className="m-0 truncate text-xs text-gray-500" title={file.typeLabel}>
                  {file.typeLabel}
                </p>
              )}
            </div>
            {file.fromLabel && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {file.fromLabel}
              </span>
            )}
          </div>
        )}

        {types && (
          <Dropdown
            label={t('moveDocument.documentType')}
            showValuePrefix={false}
            showPlaceholderOption={false}
            options={types.map(type => ({ value: type.code, label: type.label }))}
            value={documentType}
            onChange={setDocumentType}
          />
        )}

        <p className="m-0 text-xs text-gray-500">{description ?? t('moveDocument.description')}</p>

        {searchable && (
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('moveDocument.searchPlaceholder')}
            aria-label={t('moveDocument.searchPlaceholder')}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary"
          />
        )}

        <div role="radiogroup" className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-0.5">
          {shown.map(section => {
            const key = sectionKey(section);
            const isSelected = key === selectedKey;
            return (
              <label
                key={key}
                className={clsx(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <input
                  type="radio"
                  name="move-target"
                  value={key}
                  checked={isSelected}
                  onChange={() => setChosen(key)}
                  className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-gray-900">{section.label}</span>
                    {section.matches && (
                      <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        {t('moveDocument.matches')}
                      </span>
                    )}
                  </span>
                  {section.detail && (
                    <span className="block text-xs text-gray-500">{section.detail}</span>
                  )}
                </span>
              </label>
            );
          })}
          {shown.length === 0 && (
            <p className="m-0 py-4 text-center text-xs text-gray-500">
              {t('moveDocument.noMatch')}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedKey || (!!types && !documentType)}
          >
            {confirmText ?? t('moveDocument.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MoveDocumentModal;
