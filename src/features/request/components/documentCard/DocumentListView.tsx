import { useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import type { UploadedDocument } from '../../types/document';
import {
  documentKey,
  filterRows,
  groupByType,
  kpis,
  sectionStats,
  type DocFilter,
  type TypeRow,
} from '../../utils/documentList';
import DocumentCardHeader from './DocumentCardHeader';
import DocumentPreviewPane from './DocumentPreviewPane';
import DocumentSection, { type SectionActions } from './DocumentSection';
import DocumentToolbar from './DocumentToolbar';
import { useCardIsWide, usePreviewPaneShown } from './usePaneLayout';

/** More title sections than this and they start closed, as on the Request page. */
const COLLAPSE_TITLES_ABOVE = 20;

/** One section of a list: the request level, or one title. */
export interface ListSection {
  key: string;
  kind: 'request' | 'title';
  /** -1 for the request level, else the title's position. */
  index: number;
  label: string;
  /** One row per file, plus an empty row for a type that has no file yet. */
  documents: UploadedDocument[];
}

interface DocumentListViewProps {
  title: string;
  icon?: string;
  sections: ListSection[];
  /** The type's name in the UI language. */
  typeName: (code: string, displayName?: string | null) => string;
  /** What a search matches for a row (defaults to its name). */
  searchText?: (row: TypeRow) => string;
  /** Rows offer upload, and the pane offers notes and delete, where those handlers are given. */
  editable: boolean;
  onView: (doc: UploadedDocument) => void;
  onUpload?: (row: TypeRow, section: ListSection) => void;
  onSaveNotes?: (doc: UploadedDocument, notes: string) => void;
  onRemove?: (doc: UploadedDocument, section: ListSection) => void;
  onGenerate?: (row: TypeRow) => void;
  /** Edits a file (the appendix's image annotation); replaces the notes entry in the file menu. */
  onEdit?: (doc: UploadedDocument, section: ListSection) => void;
  /** Which files can be edited (all, by default). */
  canEdit?: (doc: UploadedDocument) => boolean;
  editLabel?: string;
  /** The appendix layout of a row (columns per page), and its change. */
  layoutOf?: (row: TypeRow) => number | undefined;
  onLayoutChange?: (row: TypeRow, columns: number) => void;
  /** Files dropped on a row. */
  onDropFiles?: (row: TypeRow, files: File[], section: ListSection) => void;
  /** Which rows offer "Generate". */
  canGenerate?: (row: TypeRow) => boolean;
  /** Next to the numbers in the header. */
  headerExtra?: ReactNode;
  /** The pane's "Source" line, which describes request files only. Defaults to true. */
  showSource?: boolean;
  /** The pane's "Notes" block, for lists whose files have none. Defaults to true. */
  showNotes?: boolean;
  /** Offers "show all types" (empty optional types as rows), remembered under this key. */
  allTypesToggleKey?: string;
  /** One section only: leave out its header, the card header says it already. */
  flat?: boolean;
  /** Text for a list with no sections at all. */
  emptyLabel: string;
}

/**
 * The Request page card's list (header, toolbar, collapsible sections of one row per type, file
 * chips, preview pane or drawer), for a list that is not the request form: its sections and rows
 * come in as data and what can be done to a file comes in as handlers.
 */
const DocumentListView = ({
  title,
  icon,
  sections,
  typeName,
  searchText,
  editable,
  onView,
  onUpload,
  onSaveNotes,
  onRemove,
  onGenerate,
  onEdit,
  canEdit,
  editLabel,
  layoutOf,
  onLayoutChange,
  onDropFiles,
  canGenerate,
  headerExtra,
  showSource = true,
  showNotes = true,
  allTypesToggleKey,
  flat = false,
  emptyLabel,
}: DocumentListViewProps) => {
  const { t } = useTranslation('request');
  const [query, setQuery] = useState({ query: '', filter: 'all' as DocFilter });
  const [sectionState, setSectionState] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<{ sectionKey: string; docKey: string } | null>(null);
  const [showAllTypes, setShowAllTypes] = useState(() => {
    if (!allTypesToggleKey) return false;
    try {
      return localStorage.getItem(allTypesToggleKey) === 'all';
    } catch {
      return false;
    }
  });
  const toggleAllTypes = () => {
    const next = !showAllTypes;
    setShowAllTypes(next);
    if (!allTypesToggleKey) return;
    try {
      localStorage.setItem(allTypesToggleKey, next ? 'all' : 'some');
    } catch {
      // storage can be blocked; the choice then lasts for this visit only
    }
  };
  const [cardRef, cardIsWide] = useCardIsWide();
  const [paneShown, togglePane] = usePreviewPaneShown();
  const showSidePane = cardIsWide && paneShown;

  const isFiltering = query.query.trim() !== '' || query.filter !== 'all';
  const closedByDefault = sections.filter(s => s.kind === 'title').length > COLLAPSE_TITLES_ABOVE;
  // A search or filter opens the sections it matches; otherwise the viewer's own choice, else the
  // default (many titles start closed, the request level never does).
  const isCollapsed = (state: ReadonlyMap<string, boolean>, section: ListSection) =>
    // a flat list is one headerless section: there is nothing to collapse
    isFiltering || flat
      ? false
      : (state.get(section.key) ?? (closedByDefault && section.kind === 'title'));

  const name = (row: TypeRow) => typeName(row.documentType, row.displayName);
  const search = searchText ?? name;
  const sectionRows = sections.map(section => groupByType(section.documents));
  const totals = kpis(sectionRows);
  const views = sections.map((section, i) => {
    const filtered = filterRows(sectionRows[i], query, search);
    // "All types": the empty optional types are rows too, with their own upload action
    const shown = showAllTypes
      ? sectionRows[i].filter(r => filtered.shown.includes(r) || filtered.hidden.includes(r))
      : filtered.shown;
    const hidden = showAllTypes ? [] : filtered.hidden;
    // A row that offers "Generate" is always a row: it is how the document is made
    const generated = onGenerate ? hidden.filter(row => canGenerate?.(row)) : [];
    return {
      section,
      rows: sectionRows[i],
      shown: generated.length
        ? sectionRows[i].filter(r => shown.includes(r) || generated.includes(r))
        : shown,
      hidden: hidden.filter(row => !generated.includes(row)),
    };
  });
  const missingCount = sectionRows.flat().filter(row => row.status === 'miss').length;

  const selectedSection = selected ? sections.find(s => s.key === selected.sectionKey) : undefined;
  const selectedDoc =
    selected && selectedSection
      ? (selectedSection.documents.find(
          doc => documentKey(doc) === selected.docKey && doc.fileName,
        ) ?? null)
      : null;

  // What the sections call: one object that never changes, reading the latest handlers.
  const latest = useRef<SectionActions | null>(null);
  const bySlot = (kind: 'request' | 'title', index: number) =>
    sections.find(s => s.kind === kind && s.index === index);
  latest.current = {
    toggleSection: key => {
      const section = sections.find(s => s.key === key);
      if (!section) return;
      setSectionState(prev => new Map(prev).set(key, !isCollapsed(prev, section)));
    },
    upload: (row, kind, index) => {
      const section = bySlot(kind, index);
      if (section) onUpload?.(row, section);
    },
    toggleFiles: () => {},
    toggleExpanded: rowKey =>
      setExpandedRows(prev => {
        const next = new Set(prev);
        if (next.has(rowKey)) next.delete(rowKey);
        else next.add(rowKey);
        return next;
      }),
    select: (kind, index, docKey) => {
      const section = bySlot(kind, index);
      if (section) setSelected({ sectionKey: section.key, docKey });
    },
    view: onView,
    // "Notes" on a chip opens the pane, where the notes are edited; a list with its own edit
    // (the appendix's image annotation) uses that instead
    edit: onEdit
      ? (doc, kind, index) => {
          const section = bySlot(kind, index);
          if (section) onEdit(doc, section);
        }
      : onSaveNotes
        ? (doc, kind, index) => {
            const section = bySlot(kind, index);
            if (section) setSelected({ sectionKey: section.key, docKey: documentKey(doc) });
          }
        : undefined,
    remove: onRemove
      ? (doc, kind, index) => {
          const section = bySlot(kind, index);
          if (section) onRemove(doc, section);
        }
      : undefined,
    generate: onGenerate,
    canEdit,
    setLayout: onLayoutChange,
    dropFiles: onDropFiles
      ? (row, files) => {
          const section = sections.find(s =>
            s.documents.some(d => d.documentType === row.documentType),
          );
          if (section) onDropFiles(row, files, section);
        }
      : undefined,
  };
  // Stable, so a section whose data did not change does not render. An action the list does not
  // offer is left out of the object (the chips then have no menu entry for it).
  const hasEdit = !!onSaveNotes || !!onEdit;
  const hasLayout = !!onLayoutChange;
  const hasDrop = !!onDropFiles;
  const hasRemove = !!onRemove;
  const hasGenerate = !!onGenerate;
  const sectionActions = useMemo<SectionActions>(() => {
    const at = () => latest.current as SectionActions;
    return {
      toggleSection: (...args) => at().toggleSection(...args),
      upload: (...args) => at().upload(...args),
      toggleFiles: (...args) => at().toggleFiles(...args),
      toggleExpanded: (...args) => at().toggleExpanded(...args),
      select: (...args) => at().select(...args),
      view: (...args) => at().view(...args),
      edit: hasEdit ? (...args) => at().edit?.(...args) : undefined,
      canEdit: hasEdit ? doc => at().canEdit?.(doc) ?? true : undefined,
      setLayout: hasLayout ? (...args) => at().setLayout?.(...args) : undefined,
      dropFiles: hasDrop ? (...args) => at().dropFiles?.(...args) : undefined,
      remove: hasRemove ? (...args) => at().remove?.(...args) : undefined,
      generate: hasGenerate ? (...args) => at().generate?.(...args) : undefined,
    };
  }, [hasEdit, hasLayout, hasDrop, hasRemove, hasGenerate]);

  // The slide-over is a dialog: while it is open the rest of the page is inert, so what the pane
  // starts (a confirm, the image editor) would open underneath it. It starts once the slide-over
  // has finished closing (its `afterLeave`), as on the Request card.
  const drawerAction = useRef<(() => void) | null>(null);
  const afterDrawerCloses = (action: () => void) => {
    drawerAction.current = action;
    setSelected(null);
  };
  const runDrawerAction = () => {
    const action = drawerAction.current;
    drawerAction.current = null;
    action?.();
  };

  const pane = (variant: 'side' | 'drawer') => {
    const run = (action: () => void) =>
      variant === 'drawer' ? afterDrawerCloses(action) : action();
    return (
      <DocumentPreviewPane
        variant={variant}
        showSource={showSource}
        showNotes={showNotes}
        docKey={selected?.docKey}
        doc={selectedDoc}
        documentType={selectedDoc?.documentType ?? ''}
        typeName={
          selectedDoc ? typeName(selectedDoc.documentType ?? '', selectedDoc.displayName) : ''
        }
        location={selectedSection?.label ?? ''}
        carriedFrom={null}
        dontUse={false}
        editable={editable}
        onClose={() => setSelected(null)}
        onView={onView}
        onSaveNotes={onSaveNotes}
        editLabel={editLabel}
        onEdit={
          onEdit && selectedSection && selectedDoc && (canEdit?.(selectedDoc) ?? true)
            ? doc => run(() => onEdit(doc, selectedSection))
            : undefined
        }
        onDelete={
          onRemove && selectedSection ? doc => run(() => onRemove(doc, selectedSection)) : undefined
        }
      />
    );
  };

  let renderedSections = 0;
  return (
    <>
      <div
        ref={cardRef}
        className={clsx(
          'grid items-start gap-3',
          showSidePane && 'grid-cols-[minmax(0,1fr)_300px]',
        )}
      >
        <section className="min-w-0 rounded-t-2xl rounded-b-none border border-gray-100 bg-white shadow-sm">
          <DocumentCardHeader kpis={totals} title={title} icon={icon}>
            {headerExtra}
          </DocumentCardHeader>
          <DocumentToolbar
            query={query.query}
            onQuery={value => setQuery(prev => ({ ...prev, query: value }))}
            filter={query.filter}
            onFilter={filter => setQuery(prev => ({ ...prev, filter }))}
            missingCount={missingCount}
            followUpCount={totals.followUps}
            allTypes={
              allTypesToggleKey ? { shown: showAllTypes, onToggle: toggleAllTypes } : undefined
            }
            onExpandAll={
              isFiltering || flat
                ? undefined
                : () => setSectionState(new Map(sections.map(s => [s.key, false])))
            }
            onCollapseAll={
              isFiltering || flat
                ? undefined
                : () => setSectionState(new Map(sections.map(s => [s.key, true])))
            }
            previewToggle={
              cardIsWide
                ? {
                    shown: paneShown,
                    onToggle: () => {
                      if (paneShown) setSelected(null);
                      togglePane();
                    },
                  }
                : undefined
            }
          />
          <div>
            {views.map(({ section, rows, shown, hidden }) => {
              if (isFiltering && shown.length === 0 && hidden.length === 0) return null;
              renderedSections++;
              const collapsed = isCollapsed(sectionState, section);
              return (
                <DocumentSection
                  key={section.key}
                  sectionKey={section.key}
                  entityType={section.kind}
                  entityIndex={section.index}
                  label={section.label}
                  stats={sectionStats(rows)}
                  collapsed={collapsed}
                  locked={isFiltering}
                  editable={editable && !!onUpload}
                  readOnly={!editable}
                  bulk={false}
                  headerless={flat}
                  editLabel={editLabel}
                  missingHint={false}
                  isEmpty={rows.length === 0}
                  items={
                    collapsed
                      ? []
                      : shown.map(row => ({
                          row,
                          name: name(row),
                          selectedCount: 0,
                          expanded: expandedRows.has(`${section.key}|${row.documentType}`),
                          generate: !!onGenerate && !!canGenerate?.(row),
                          layout: editable ? layoutOf?.(row) : undefined,
                          carried: row.files.map(() => false),
                          dontUse: row.files.map(() => false),
                        }))
                  }
                  emptyTypes={collapsed ? [] : hidden.map(row => ({ row, name: name(row) }))}
                  selectedDocKey={selected?.sectionKey === section.key ? selected.docKey : null}
                  carriedNumber=""
                  actions={sectionActions}
                  getDocKey={documentKey}
                />
              );
            })}
            {renderedSections === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                {isFiltering ? t('docCard.noMatch') : emptyLabel}
              </div>
            )}
          </div>
        </section>
        {showSidePane && pane('side')}
      </div>
      <SlideOverPanel
        isOpen={!showSidePane && selectedDoc !== null}
        onClose={() => setSelected(null)}
        title={selectedDoc?.fileName ?? ''}
        width="md"
        afterLeave={runDrawerAction}
      >
        {selectedDoc && pane('drawer')}
      </SlideOverPanel>
    </>
  );
};

export default DocumentListView;
