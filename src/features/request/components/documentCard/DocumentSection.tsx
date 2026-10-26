import { memo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { UploadedDocument } from '../../types/document';
import { visibleFiles, type SectionStats, type TypeRow } from '../../utils/documentList';
import DocumentFileChip from './DocumentFileChip';
import DocumentTypeRow from './DocumentTypeRow';

type EntityType = 'request' | 'title';

/**
 * What a section does. One object that never changes identity (it reads the latest handlers behind
 * the scenes), so a section can skip rendering when its own data is unchanged.
 */
export interface SectionActions {
  toggleSection: (sectionKey: string) => void;
  upload: (row: TypeRow, entityType: EntityType, entityIndex: number) => void;
  toggleFiles: (
    entityType: EntityType,
    entityIndex: number,
    files: UploadedDocument[],
    checked: boolean,
  ) => void;
  toggleExpanded: (rowKey: string) => void;
  select: (entityType: EntityType, entityIndex: number, docKey: string) => void;
  view: (doc: UploadedDocument) => void;
  /** Each of these is left out where the list does not offer it (the Document Checklist page). */
  edit?: (doc: UploadedDocument, entityType: EntityType, entityIndex: number) => void;
  move?: (doc: UploadedDocument, entityType: EntityType, entityIndex: number) => void;
  replace?: (doc: UploadedDocument, entityType: EntityType, entityIndex: number) => void;
  remove?: (doc: UploadedDocument, entityType: EntityType, entityIndex: number) => void;
  generate?: (row: TypeRow) => void;
  /** Whether this file's menu offers the edit entry (it can depend on the file). Defaults to yes. */
  canEdit?: (doc: UploadedDocument) => boolean;
  setLayout?: (row: TypeRow, columns: number) => void;
  dropFiles?: (row: TypeRow, files: File[]) => void;
}

/** A type row of a section with what the section itself decides about it. */
export interface SectionItem {
  row: TypeRow;
  name: string;
  /** How many of the row's files are ticked. */
  selectedCount: number;
  expanded: boolean;
  /** The row offers "Generate" (a system-generated document type). */
  generate?: boolean;
  /** Generate is offered but not possible now: why (the button is disabled with this tooltip). */
  generateDisabledReason?: string;
  /** The appendix layout (columns per page) of the row, where the list has one. */
  layout?: number;
  /** Per file of the row: it came from the previous appraisal and the maker is still working. */
  carried: boolean[];
  /** Per file of the row: delete reads "Don't use this file". */
  dontUse: boolean[];
}

interface DocumentSectionProps {
  /** Identifies the section across reorders: the title's id, or the request. */
  sectionKey: string;
  entityType: EntityType;
  entityIndex: number;
  label: string;
  stats: SectionStats;
  collapsed: boolean;
  /** A search or filter decides what is open: the header is not a toggle meanwhile. */
  locked: boolean;
  editable: boolean;
  readOnly: boolean;
  /** Rows have checkboxes (when editable). Defaults to true; the Document Checklist turns it off. */
  bulk?: boolean;
  /** No header: the list is one section and the card header already says it. */
  headerless?: boolean;
  /** The text of the edit entry in each file's menu ("Notes" by default). */
  editLabel?: string;
  /** A required type without a file says "attach before submit". Defaults to true. */
  missingHint?: boolean;
  /** The section holds no rows at all. */
  isEmpty: boolean;
  items: SectionItem[];
  /** Empty optional types, collapsed into one line of "+ type" chips. */
  emptyTypes: { row: TypeRow; name: string }[];
  /** The docKey of the section's file that is open in the preview, if any. */
  selectedDocKey: string | null;
  /** The previous appraisal's number, shown on the files carried from it. */
  carriedNumber: string;
  actions: SectionActions;
  getDocKey: (doc: UploadedDocument) => string;
}

const sameRow = (a: TypeRow, b: TypeRow) =>
  a === b ||
  (a.documentType === b.documentType &&
    a.displayName === b.displayName &&
    a.required === b.required &&
    a.status === b.status &&
    a.slot === b.slot &&
    a.files.length === b.files.length &&
    a.files.every((file, i) => file === b.files[i]));

const sameList = <T,>(a: T[], b: T[], same: (x: T, y: T) => boolean) =>
  a.length === b.length && a.every((x, i) => same(x, b[i]));

/** Two renders of a section that would look and act the same. Only data is compared: the actions never change. */
const sameSection = (a: DocumentSectionProps, b: DocumentSectionProps) =>
  a.sectionKey === b.sectionKey &&
  a.entityType === b.entityType &&
  a.entityIndex === b.entityIndex &&
  a.label === b.label &&
  a.collapsed === b.collapsed &&
  a.locked === b.locked &&
  a.editable === b.editable &&
  a.readOnly === b.readOnly &&
  a.bulk === b.bulk &&
  a.headerless === b.headerless &&
  a.editLabel === b.editLabel &&
  a.missingHint === b.missingHint &&
  a.isEmpty === b.isEmpty &&
  a.selectedDocKey === b.selectedDocKey &&
  a.carriedNumber === b.carriedNumber &&
  a.actions === b.actions &&
  a.getDocKey === b.getDocKey &&
  a.stats.types === b.stats.types &&
  a.stats.filled === b.stats.filled &&
  a.stats.required === b.stats.required &&
  a.stats.requiredDone === b.stats.requiredDone &&
  sameList(a.emptyTypes, b.emptyTypes, (x, y) => x.name === y.name && sameRow(x.row, y.row)) &&
  sameList(
    a.items,
    b.items,
    (x, y) =>
      x.name === y.name &&
      x.selectedCount === y.selectedCount &&
      x.expanded === y.expanded &&
      x.generate === y.generate &&
      x.generateDisabledReason === y.generateDisabledReason &&
      x.layout === y.layout &&
      sameList(x.carried, y.carried, (p, q) => p === q) &&
      sameList(x.dontUse, y.dontUse, (p, q) => p === q) &&
      sameRow(x.row, y.row),
  );

/** The "+ type" chip of an empty type: uploads into it, and takes files dropped on it where the list can. */
const EmptyTypeChip = ({
  name,
  onClick,
  onDropFiles,
}: {
  name: string;
  onClick: () => void;
  onDropFiles?: (files: File[]) => void;
}) => {
  const [dragOver, setDragOver] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={
        onDropFiles
          ? e => {
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              setDragOver(true);
            }
          : undefined
      }
      onDragLeave={onDropFiles ? () => setDragOver(false) : undefined}
      onDrop={
        onDropFiles
          ? e => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) onDropFiles(files);
            }
          : undefined
      }
      className={clsx(
        'cursor-pointer rounded-full border border-dashed px-3 py-0.5 text-sm hover:border-primary hover:text-(--palette-primary-text)',
        dragOver
          ? 'border-primary bg-primary/5 text-(--palette-primary-text)'
          : 'border-(--palette-line-strong) text-(--palette-gray-600)',
      )}
    >
      + {name}
    </button>
  );
};

/**
 * A collapsible section (the request, or one title): header with progress, rows, empty-types line.
 * A collapsed section is its header only; its rows are not even built.
 */
const DocumentSection = ({
  sectionKey,
  entityType,
  entityIndex,
  label,
  stats,
  collapsed,
  locked,
  editable,
  readOnly,
  bulk = true,
  headerless = false,
  editLabel,
  missingHint = true,
  isEmpty,
  items,
  emptyTypes,
  selectedDocKey,
  carriedNumber,
  actions,
  getDocKey,
}: DocumentSectionProps) => {
  const { t } = useTranslation('request');
  const isRequest = entityType === 'request';
  const pct = stats.required ? Math.round((stats.requiredDone / stats.required) * 100) : 100;

  return (
    <div className="@container border-t border-(--palette-line-soft) first:border-t-0">
      {!headerless && (
        <button
          type="button"
          onClick={() => actions.toggleSection(sectionKey)}
          disabled={locked}
          aria-expanded={!collapsed}
          className={clsx(
            'flex w-full items-center gap-2 bg-(--palette-surface-2) px-4 py-2 text-left text-sm font-semibold text-(--palette-ink) select-none',
            locked ? 'cursor-default' : 'cursor-pointer hover:bg-(--palette-surface-3)',
          )}
        >
          <Icon
            name={collapsed ? 'chevron-right' : 'chevron-down'}
            style="solid"
            className="size-3"
          />
          <Icon
            name={isRequest ? 'folder-open' : 'file-certificate'}
            style="solid"
            className="size-3.5 text-(--palette-gray-400)"
          />
          <span className="min-w-0 truncate">{label}</span>
          <span className="font-normal text-(--palette-gray-500)">
            {t('docCard.section.typesWithFiles', { filled: stats.filled, total: stats.types })}
          </span>
          {stats.required > 0 && (
            <>
              <span
                className="h-1 w-16 overflow-hidden rounded-sm bg-(--palette-line)"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={stats.required}
                aria-valuenow={stats.requiredDone}
              >
                <i
                  className={clsx('block h-full', pct < 100 ? 'bg-amber-500' : 'bg-green-600')}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="font-normal text-(--palette-gray-500)">
                {t('docCard.section.required', { done: stats.requiredDone, total: stats.required })}
              </span>
            </>
          )}
        </button>
      )}
      {(headerless || !collapsed) && (
        <>
          {isEmpty && (
            <div className="px-4 py-4 text-center text-sm text-(--palette-gray-500)">
              {t('empty.noDocumentsSection')}
            </div>
          )}
          {items.map(
            ({
              row,
              name,
              selectedCount,
              expanded,
              generate,
              generateDisabledReason,
              layout,
              carried,
              dontUse,
            }) => {
              const rowKey = `${sectionKey}|${row.documentType}`;
              return (
                <DocumentTypeRow
                  key={rowKey}
                  row={row}
                  name={name}
                  editable={editable}
                  hasCheckbox={editable && bulk}
                  showMissingHint={missingHint}
                  onGenerate={generate ? () => actions.generate?.(row) : undefined}
                  generateDisabledReason={generate ? generateDisabledReason : undefined}
                  layout={layout}
                  onLayoutChange={
                    layout !== undefined && actions.setLayout
                      ? columns => actions.setLayout?.(row, columns)
                      : undefined
                  }
                  onDropFiles={
                    editable && actions.dropFiles
                      ? files => actions.dropFiles?.(row, files)
                      : undefined
                  }
                  selectedCount={selectedCount}
                  onToggleSelect={checked =>
                    actions.toggleFiles(entityType, entityIndex, row.files, checked)
                  }
                  expanded={expanded}
                  onToggleExpanded={() => actions.toggleExpanded(rowKey)}
                  onUpload={() => actions.upload(row, entityType, entityIndex)}
                  chips={visibleFiles(row.files, expanded).map(doc => {
                    const at = row.files.indexOf(doc);
                    return (
                      <DocumentFileChip
                        key={getDocKey(doc)}
                        doc={doc}
                        selected={selectedDocKey === getDocKey(doc)}
                        carriedFrom={carried[at] ? carriedNumber : null}
                        dontUse={dontUse[at] ?? false}
                        readOnly={readOnly}
                        onSelect={() => actions.select(entityType, entityIndex, getDocKey(doc))}
                        onView={actions.view}
                        editLabel={editLabel}
                        onEdit={
                          actions.edit && (actions.canEdit?.(doc) ?? true)
                            ? d => actions.edit?.(d, entityType, entityIndex)
                            : undefined
                        }
                        onMove={actions.move && (d => actions.move?.(d, entityType, entityIndex))}
                        onReplace={
                          actions.replace && (d => actions.replace?.(d, entityType, entityIndex))
                        }
                        onDelete={
                          actions.remove && (d => actions.remove?.(d, entityType, entityIndex))
                        }
                      />
                    );
                  })}
                />
              );
            },
          )}
          {emptyTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-(--palette-line-soft) px-4 py-2.5 text-sm text-(--palette-gray-500)">
              {t('docCard.emptyTypes', { n: emptyTypes.length })}
              {emptyTypes.map(type =>
                editable ? (
                  <EmptyTypeChip
                    key={type.row.documentType}
                    name={type.name}
                    onClick={() => actions.upload(type.row, entityType, entityIndex)}
                    onDropFiles={
                      actions.dropFiles ? files => actions.dropFiles?.(type.row, files) : undefined
                    }
                  />
                ) : (
                  <span
                    key={type.row.documentType}
                    className="rounded bg-(--palette-surface-3) px-2 py-0.5 text-sm text-(--palette-gray-600)"
                  >
                    {type.name}
                  </span>
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default memo(DocumentSection, sameSection);
