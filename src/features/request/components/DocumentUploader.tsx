import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useAuthStore } from '@features/auth/store.ts';
import DocumentEditModal from './DocumentEditModal';
import MoveDocumentModal, { type MoveTargetSection } from './MoveDocumentModal';
import AddTitleDocumentModal from './AddTitleDocumentModal';
import CarryForwardSummary, { CarryForwardLoadError } from './CarryForwardSummary';
import CreateRequestFileInput, {
  type CreateRequestFileInputHandle,
} from './CreateRequestFileInput';
import DocumentCardHeader from './documentCard/DocumentCardHeader';
import DocumentPreviewPane from './documentCard/DocumentPreviewPane';
import { useCardIsWide, usePreviewPaneShown } from './documentCard/usePaneLayout';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import DocumentSection, { type SectionActions } from './documentCard/DocumentSection';
import DocumentToolbar from './documentCard/DocumentToolbar';
import { useTitleLabel } from '../hooks/useTitleLabel';
import {
  APPOINTMENT_LETTER_DOC_TYPE,
  APPOINTMENT_LETTER_FILE,
  isGeneratedAppointmentLetter,
  useAppointmentLetter,
} from '../hooks/useAppointmentLetter';
import { useTitleEditorOpen } from '../store/titleEditorStore';
import { MAX_UPLOAD_BYTES, useUploadDocument, useViewDocument } from '../api';
import {
  placeInFlight,
  revertInFlight,
  runLimited,
  splitUploadable,
  startInFlight,
} from '../utils/uploadFiles';
import {
  useGetPriorAppraisalDocuments,
  type CarryForwardDocument,
} from '@/features/appraisal/api/priorAppraisal';
import {
  removeFiles,
  deriveCarryForward,
  carriedTitleRef,
  makeUploadedRow,
  restoreTarget,
  isCarried,
  placeDocument,
  pickCarryForwardTitles,
  titleNumberOf,
  titleKey,
  formTitleKey,
  type CarryForwardTitle,
  toFormDocument,
} from '../utils/carryForward';
import {
  alwaysShowType,
  documentKey,
  filterRows,
  groupByType,
  kpis,
  sectionStats,
  visibleFiles,
  withTypeRow,
  type DocFilter,
  type TypeRow,
} from '../utils/documentList';
import { getDocumentCategory, type UploadedDocument } from '../types/document';
import {
  useGetDocumentTypes,
  getDocumentTypeName,
  getDocumentTypeSearchText,
} from '../api/documentTypes';

/** More titles than this and their document sections start closed. */
const COLLAPSE_TITLES_ABOVE = 20;

interface DocumentUploaderProps {
  getOrCreateSession: () => Promise<string>;
  /** Saved request id: what the appointment letter on the D035 row is generated for. */
  requestId?: string;
  /** Request not submitted yet: mark files taken from the previous appraisal and let the maker leave some out. */
  showCarryForward?: boolean;
  /** Reload (and, after a failed pick, apply) the previous appraisal's documents. */
  onRetryCarryForward?: () => void;
  /** The default files still have to be added, whatever the list's own load state says now. */
  /** A pick is loading: the retry action is held, like the selector is. */
  carryBusy?: boolean;
  /**
   * Show only this title's documents, for the title editor: no card header, toolbar, drop bar,
   * preview pane or unused-files list, and no Move. A click on a file opens it in a new tab.
   */
  scope?: { titleIndex: number; heading: string };
}

/** The server's own message for a failed request, when it sent one. */
const apiErrorDetail = (error: unknown): string | undefined =>
  (error as { apiError?: { detail?: string } } | null)?.apiError?.detail;

const NO_TITLES: CarryForwardTitle[] = [];

const DocumentCard: React.FunctionComponent<
  DocumentUploaderProps & { titles: CarryForwardTitle[] }
> = ({
  titles,
  getOrCreateSession,
  requestId,
  showCarryForward = false,
  onRetryCarryForward,
  carryBusy = false,
  scope,
}) => {
  const { t } = useTranslation(['request', 'common']);
  const scoped = scope !== undefined;
  const isReadOnly = useFormReadOnly();
  const currentUser = useAuthStore(state => state.user);
  const { data: documentTypes = [] } = useGetDocumentTypes();
  const { control, getValues, setValue } = useFormContext();
  // What this card renders from is subscribed with useWatch, which re-renders the card alone. A
  // `watch()` here (anywhere, even in a handler) would re-render the whole page on every keystroke
  // under that path. Handlers and effects read the current value with getValues. The titles come
  // in as a prop (see DocumentUploader below).
  useWatch({ control, name: 'documents' }); // subscribe only; the rows are read with getValues
  const prevAppraisalId = useWatch({ control, name: 'detail.prevAppraisalId' });
  const prevAppraisalReportNo = useWatch({ control, name: 'detail.prevAppraisalReportNo' });
  const requestNumber = useWatch({ control, name: 'requestNumber' });
  const carryOn = showCarryForward && !isReadOnly;
  const {
    data: carryData,
    isError: carryLoadFailed,
    isFetching: carryFetching,
  } = useGetPriorAppraisalDocuments(prevAppraisalId, carryOn);
  // "Don't use" is only offered while the unused list can bring the file back; without that list a
  // carried row is deleted like any other, with the confirm.
  const canDontUse = carryOn && !!carryData && carryData.documents.length > 0;
  // …and only for a row whose own file the endpoint lists, so it will be in the unused list.
  const carriedDocumentIds = useMemo(
    () => new Set(carryData?.documents.map(entry => entry.documentId)),
    [carryData],
  );
  const canDontUseRow = (doc: UploadedDocument) =>
    canDontUse && isCarried(doc) && carriedDocumentIds.has(doc.documentId ?? '');
  const uploadBarRef = useRef<CreateRequestFileInputHandle>(null);
  // The side pane needs room: on a narrow card (the page's own right panel counts) it is not
  // rendered and the same content opens as a slide-over. The user can also collapse it on a wide one.
  const titleLabels = useTitleLabel();
  const [cardRef, cardIsWide] = useCardIsWide();
  const [paneShown, togglePane] = usePreviewPaneShown();
  const showSidePane = cardIsWide && paneShown && !scoped;
  // The slide-over is a dialog: while it is open the rest of the page is inert, so the file picker
  // (Replace), the move chooser and the delete confirm would not work behind it. They start once
  // the slide-over has finished closing (its `afterLeave`).
  const drawerAction = useRef<(() => void) | null>(null);
  const afterDrawerCloses = (action: () => void) => {
    drawerAction.current = action;
    setSelectedFile(null);
  };
  const runDrawerAction = () => {
    const action = drawerAction.current;
    drawerAction.current = null;
    action?.();
  };
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // A drag that ends anywhere (dropped elsewhere, cancelled with Escape) must not leave the
  // highlight on.
  useEffect(() => {
    const stop = () => setIsDraggingOver(false);
    window.addEventListener('dragend', stop);
    window.addEventListener('drop', stop);
    return () => {
      window.removeEventListener('dragend', stop);
      window.removeEventListener('drop', stop);
    };
  }, []);
  // The file open in the side pane, found again by key each render so it follows edits and goes
  // away when the file does.
  const [selectedFile, setSelectedFile] = useState<{
    entityType: 'request' | 'title';
    entityIndex: number;
    docKey: string;
  } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [listQuery, setListQuery] = useState({
    query: '',
    filter: 'all' as DocFilter,
  });
  const [editingDocument, setEditingDocument] = useState<{
    document: UploadedDocument;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const [replacingDocument, setReplacingDocument] = useState<{
    docType: string;
    docKey: string;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const [movingDocument, setMovingDocument] = useState<{
    document: UploadedDocument;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  // The slide-over's own file input. It lives inside the dialog, so Replace can open the picker in
  // the click itself (a picker opened later, after the dialog closed, is blocked by Safari).
  const drawerReplaceInputRef = useRef<HTMLInputElement>(null);
  const [uploadingToDocument, setUploadingToDocument] = useState<{
    docType: string;
    /** Key of the empty slot row the file goes into (other rows of the type are left alone); null = add a row. */
    docKey: string | null;
    required: boolean;
    entityType: 'request' | 'title';
    entityIndex: number;
  } | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  // A title's drawer: "add another document" asks for the type, then opens the file picker
  const [addOtherOpen, setAddOtherOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    document: UploadedDocument | null;
    entityType: 'request' | 'title';
    entityIndex: number;
  }>({ isOpen: false, document: null, entityType: 'request', entityIndex: -1 });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  // Generating the letter when D035 already holds files: what it would replace, until the maker says
  const [generateConfirm, setGenerateConfirm] = useState<{
    row: TypeRow;
    keys: string[];
    /** The files are the system's own earlier letters (else they are the maker's uploads). */
    generated: boolean;
  } | null>(null);
  const appointment = useAppointmentLetter(requestId, getOrCreateSession);
  // Sections the maker opened or closed by hand, by section key. Anything not in here follows the
  // default: with many titles the title sections start closed (see COLLAPSE_TITLES_ABOVE).
  const [sectionState, setSectionState] = useState<ReadonlyMap<string, boolean>>(new Map());
  // Decided once, when the card first has titles (a request opened with 80, or 80 imported into an
  // empty one), and not again: adding the 21st title must not close what the maker has open.
  // With no titles left it is decided again: every title deleted and 80 imported, or the form
  // reset to another request without this card remounting.
  const closedByDefault = useRef<boolean | null>(null);
  if (titles.length === 0) closedByDefault.current = null;
  else if (closedByDefault.current === null) {
    closedByDefault.current = titles.length > COLLAPSE_TITLES_ABOVE;
  }
  // A title with no id yet is keyed by its position, so when the titles are removed or reordered
  // those keys point at other titles: forget what was set by hand for them (the section's open
  // state and its rows' expanded files). Plain appends keep them. An unsaved title is told apart
  // by its type and number, so a reorder among unsaved titles is seen too.
  const prevTitleIds = useRef<string[]>([]);
  useEffect(() => {
    const ids = titles.map(
      title => title.id ?? `new:${title.collateralType}|${titleNumberOf(title)}`,
    );
    const prev = prevTitleIds.current;
    prevTitleIds.current = ids;
    if (ids.length >= prev.length && prev.every((id, i) => id === ids[i])) return;
    const withoutStale = (keys: Iterable<string>, drop: (key: string) => void) => {
      for (const key of [...keys]) if (key.startsWith('title-new-')) drop(key);
    };
    setSectionState(state => {
      const next = new Map(state);
      withoutStale(state.keys(), key => next.delete(key));
      return next.size === state.size ? state : next;
    });
    setExpandedRows(rows => {
      const next = new Set(rows);
      withoutStale(rows, key => next.delete(key));
      return next.size === rows.size ? rows : next;
    });
  }, [titles]);

  // mutateAsync, not mutate: the callbacks of mutate() are dropped when the component unmounts, which
  // would leave a row "uploading" for good. The promise settles either way.
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const viewDocument = useViewDocument();

  // Object URLs handed to preview tabs for files that are not uploaded yet, kept so they can be
  // released when the attachment goes. Not on a timer: that would break the preview tab's reload
  // button, which is the same reason the server-side path waits for its tab to close.
  const localPreviewUrls = useRef(new Map<File, { url: string; pinned?: boolean }>());

  // Anything still held when the form goes: a preview URL outlives its File otherwise, and with it
  // the whole file, for the rest of the session. This does revoke under a preview tab the user
  // still has open — its reload button stops working — and unlike the server-side path there is no
  // way to wait for that tab instead: `window.open(..., 'noopener')` hands back no handle to watch,
  // and the noopener is not negotiable for a blob that is same-origin with the app. Bounded memory
  // wins over a reload of a file that is already on screen.
  useEffect(() => {
    const urls = localPreviewUrls.current;
    return () => {
      urls.forEach(({ url }) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // …and anything whose file has left the form while it stayed mounted — deleted, bulk-deleted,
  // replaced, or dropped by a `reset()` (what happens after a save, when the rows come back as
  // server DTOs with no `file`). Reconciling against what is actually attached covers all of them
  // at once, rather than asking four call sites to remember.
  const reconcilePreviews = () => {
    if (localPreviewUrls.current.size === 0) return;

    const attached = new Set<File>();
    for (const doc of (getValues('documents') as UploadedDocument[] | undefined) ?? []) {
      if (doc.file) attached.add(doc.file);
    }
    for (const title of (getValues('titles') as { documents?: UploadedDocument[] }[] | undefined) ??
      []) {
      for (const doc of title?.documents ?? []) {
        if (doc.file) attached.add(doc.file);
      }
    }

    localPreviewUrls.current.forEach((entry, file) => {
      // Pinned means a replace is in flight and this file may be put back if the upload fails —
      // see handleReplaceFileSelected. Everything else that is no longer attached is finished
      // with, and a URL left registered keeps the whole File alive for the rest of the session.
      if (entry.pinned || attached.has(file)) return;

      URL.revokeObjectURL(entry.url);
      localPreviewUrls.current.delete(file);
    });
  };

  useEffect(() => {
    reconcilePreviews();
  });

  // Toggle section collapse state
  const toggleSection = (sectionKey: string) => {
    setSectionState(prev => new Map(prev).set(sectionKey, !isCollapsedKey(prev, sectionKey)));
  };

  // Helper to create unique document identifier (per section + per document)
  // Uses | as separator to avoid issues with negative entityIndex (-1)
  const getDocumentId = (entityType: 'request' | 'title', entityIndex: number, docKey: string) => {
    return `${entityType}|${entityIndex}|${docKey}`;
  };

  // Get uploaded documents for request level
  const getRequestDocuments = (): UploadedDocument[] => {
    return getValues('documents') || [];
  };

  // Get uploaded documents for a specific title
  const getTitleDocuments = (entityIndex: number): UploadedDocument[] => {
    return getValues(`titles.${entityIndex}.documents`) || [];
  };

  // Generate sections with their uploaded documents
  interface DocumentSection {
    /** Stays with the section when the titles are reordered: the title's id once it has one. */
    sectionKey: string;
    entityType: 'request' | 'title';
    entityKey: string;
    entityIndex: number;
    documents: UploadedDocument[];
  }

  const generateDocumentSections = (): DocumentSection[] => {
    // The title editor's list: just its title (no labels are needed, the editor says which)
    if (scope)
      return [
        {
          sectionKey: titles[scope.titleIndex]?.id
            ? `title-${titles[scope.titleIndex].id}`
            : `title-new-${scope.titleIndex}`,
          entityType: 'title',
          entityKey: '',
          entityIndex: scope.titleIndex,
          documents: getTitleDocuments(scope.titleIndex),
        },
      ];
    const sections: DocumentSection[] = [];

    // Add request-level section
    sections.push({
      sectionKey: 'request',
      entityType: 'request',
      entityKey: requestNumber || t('moveDocument.requestLevelLabel'),
      entityIndex: -1,
      documents: getRequestDocuments(),
    });

    // Add title-level sections
    const labels = titleLabels(titles);
    titles.forEach((_title, index) => {
      sections.push({
        sectionKey: _title?.id ? `title-${_title.id}` : `title-new-${index}`,
        entityType: 'title',
        entityKey: labels[index],
        entityIndex: index,
        documents: getTitleDocuments(index),
      });
    });

    return sections;
  };

  // The empty slot row with this key, i.e. the one the upload targets, never a filled row of the same type
  const getEmptySlot = (
    entityType: 'request' | 'title',
    entityIndex: number,
    docKey: string,
  ): UploadedDocument | null =>
    (entityType === 'request' ? getRequestDocuments() : getTitleDocuments(entityIndex)).find(
      (doc: UploadedDocument) => documentKey(doc) === docKey && !doc.fileName,
    ) || null;

  // `dirty: false` is for a row that is only on its way (an upload, a letter being made) and for taking
  // it back out: nothing the maker changed yet, so a failure leaves the form as clean as it was. The
  // write that settles it (the file arrived) marks the form dirty, as every edit does.
  const updateDocument = (
    entityType: 'request' | 'title',
    entityIndex: number,
    _docType: string,
    updater: (docs: UploadedDocument[]) => UploadedDocument[],
    dirty = true,
  ) => {
    if (entityType === 'request') {
      const documents = getValues('documents') || [];
      setValue('documents', updater(documents), { shouldDirty: dirty });
    } else {
      const titleDocuments = getValues(`titles.${entityIndex}.documents`) || [];
      setValue(`titles.${entityIndex}.documents`, updater(titleDocuments), {
        shouldDirty: dirty,
      });
    }
  };

  const handleDelete = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    if (canDontUseRow(document)) {
      removeDocument(document, entityType, entityIndex, 'carryForward.toasts.unused');
      return;
    }
    setDeleteConfirm({ isOpen: true, document, entityType, entityIndex });
  };

  const removeDocument = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
    // "Don't use" on a carried row says so in its own words instead of "deleted"
    toastKey?: 'carryForward.toasts.unused',
  ) => {
    const targetKey = documentKey(document);

    // A required row keeps an empty slot only when it is the last of its type (see removeFiles)
    updateDocument(entityType, entityIndex, document.documentType || '', docs =>
      removeFiles(docs, doc => documentKey(doc) === targetKey),
    );
    toast.success(
      t(
        toastKey ?? (document.isRequired ? 'toasts.documentFileRemoved' : 'toasts.documentDeleted'),
      ),
    );
  };

  // Puts a carried file into a section: its empty slot of that type, else a new row, stamped PREV
  const restoreInto = (
    doc: CarryForwardDocument,
    target: { entityType: 'request' | 'title'; entityIndex: number },
  ) => {
    const titleId = target.entityType === 'title' ? (titles[target.entityIndex]?.id ?? null) : null;
    updateDocument(target.entityType, target.entityIndex, doc.suggestedType, docs =>
      placeDocument(docs, toFormDocument(doc, titleId)),
    );
    toast.success(t('carryForward.toasts.restored'));
  };

  // Where a file goes when it comes back: request level, or the one title with its key. A title
  // file that matches none, or several, asks the maker which section it belongs in.
  const [restoreChooser, setRestoreChooser] = useState<CarryForwardDocument | null>(null);
  const handleRestoreCarried = (doc: CarryForwardDocument) => {
    const target = restoreTarget(titles, doc);
    if (target) restoreInto(doc, target);
    else setRestoreChooser(doc);
  };

  const confirmDelete = () => {
    if (!deleteConfirm.document) return;

    const { document, entityType, entityIndex } = deleteConfirm;
    removeDocument(document, entityType, entityIndex);

    setDeleteConfirm({ isOpen: false, document: null, entityType: 'request', entityIndex: -1 });
  };

  const handleEdit = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setEditingDocument({ document, entityType, entityIndex });
  };

  const handleSaveEdit = (updatedDocument: UploadedDocument) => {
    if (!editingDocument) return;

    const { entityType, entityIndex } = editingDocument;
    const targetKey = documentKey(editingDocument.document);

    updateDocument(entityType, entityIndex, updatedDocument.documentType || '', docs =>
      docs.map(doc => (documentKey(doc) === targetKey ? updatedDocument : doc)),
    );

    setEditingDocument(null);
    toast.success(t('toasts.documentDetailsUpdated'));
  };

  const handleMove = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
  ) => {
    setMovingDocument({ document, entityType, entityIndex });
  };

  const performMove = (target: MoveTargetSection) => {
    if (!movingDocument) return;

    const { document, entityType, entityIndex } = movingDocument;
    const movingKey = documentKey(document);

    // Remove from the source section (required placeholders are re-added by the required-doc hooks)
    updateDocument(entityType, entityIndex, document.documentType || '', docs =>
      docs.filter(doc => documentKey(doc) !== movingKey),
    );

    // Build the moved doc: a new row for the target (no id), same file (documentId) and same source.
    const movedDoc: UploadedDocument = {
      ...document,
      id: null,
      rowId: crypto.randomUUID(),
      titleId:
        target.entityType === 'title'
          ? (getValues(`titles.${target.entityIndex}.id`) ?? null)
          : null,
    };

    // It goes into an empty placeholder of the same type in the target (e.g. a required slot) when
    // there is one, taking over that slot's id and rowId so a save updates the slot's row instead of
    // adding one beside it; otherwise it is appended as a new row. The source row was removed above.
    updateDocument(target.entityType, target.entityIndex, document.documentType || '', docs =>
      placeDocument(docs, movedDoc),
    );

    setMovingDocument(null);
    toast.success(t('toasts.documentMoved'));
  };

  // `input` is the file input to open: the card's own, or the one inside the slide-over (which must
  // be opened in the click itself, so Replace never has to wait for the slide-over to close).
  const handleReplace = (
    document: UploadedDocument,
    entityType: 'request' | 'title',
    entityIndex: number,
    input: React.RefObject<HTMLInputElement | null> = replaceFileInputRef,
  ) => {
    setReplacingDocument({
      docType: document.documentType || '',
      docKey: documentKey(document),
      entityType,
      entityIndex,
    });
    input.current?.click();
  };

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocument) return;

    const { docType, docKey, entityType, entityIndex } = replacingDocument;

    // The same check as a pick of several files: a type the system does not take, or one too big, is
    // refused here with the same message, and nothing is touched
    const { valid, skipped } = splitUploadable([file], MAX_UPLOAD_BYTES);
    if (valid.length === 0) {
      setReplacingDocument(null);
      e.target.value = '';
      toast.error(
        t('toasts.uploadFilesSkipped', {
          n: skipped.length,
          names: skipped.map(item => item.file.name).join(', '),
        }),
      );
      return;
    }

    // Get current document to preserve metadata (match the exact row by key)
    const currentDoc =
      (entityType === 'request' ? getRequestDocuments() : getTitleDocuments(entityIndex)).find(
        d => documentKey(d) === docKey,
      ) || null;

    // The row went (deleted, moved, or replaced by something else) while the picker was open: there is
    // nothing to replace, and uploading would leave the file attached to nothing.
    if (!currentDoc) {
      setReplacingDocument(null);
      e.target.value = '';
      toast.error(t('toasts.documentReplaceFailed'));
      return;
    }

    // The outgoing file leaves the form now but comes back if the upload fails, so its preview URL
    // is pinned until this settles — the reconcile would otherwise release it on the next render
    // and the restored row would point at a dead URL.
    const outgoing = currentDoc.file ? localPreviewUrls.current.get(currentDoc.file) : undefined;
    if (outgoing) outgoing.pinned = true;
    const unpinOutgoing = () => {
      if (outgoing) outgoing.pinned = false;
    };

    // The row's key, held through the whole replace: it stays what it was (the key the selection and
    // the list know it by), so the file stays selected while it is replaced.
    const rowKey = documentKey(currentDoc);

    // The replacing row keeps the old row's metadata. The file is the maker's own now (makeUploadedRow
    // stamps that), even on a row that carried one from the previous appraisal.
    const tempDocument = makeUploadedRow({
      id: currentDoc.id || null,
      titleId: currentDoc.titleId || null,
      documentId: currentDoc.documentId || null,
      documentType: docType || null,
      fileName: file.name,
      prefix: currentDoc.prefix || null,
      notes: currentDoc.notes || null,
      filePath: currentDoc.filePath || null,
      createdWorkstation: currentDoc.createdWorkstation || null,
      isRequired: currentDoc.isRequired || false,
      uploadedBy: currentUser?.username || 'anonymous',
      uploadedByName: currentUser?.name || 'Anonymous',
      file,
      isUploading: true,
      displayName: currentDoc.displayName,
      rowId: rowKey,
    });

    // Update document with uploading state
    updateDocument(
      entityType,
      entityIndex,
      docType,
      docs => docs.map(doc => (documentKey(doc) === docKey ? tempDocument : doc)),
      false,
    );

    // Reset replace state early
    setReplacingDocument(null);
    e.target.value = '';

    let sessionId: string;
    try {
      // Get or create an upload session
      sessionId = await getOrCreateSession();
    } catch (error) {
      // Session creation failed - revert to original
      updateDocument(
        entityType,
        entityIndex,
        docType,
        docs => docs.map(doc => (doc.rowId === rowKey ? currentDoc : doc)),
        false,
      );
      unpinOutgoing();
      toast.error(apiErrorDetail(error) || t('toasts.sessionFailed'));
      return;
    }

    try {
      // Upload new file with session
      const uploadedDoc = await uploadDocument({
        uploadSessionId: sessionId,
        file,
        documentType: docType,
        documentCategory: getDocumentCategory(docType),
      });
      // A new object for the row: the watched one is never changed in place
      updateDocument(entityType, entityIndex, docType, docs =>
        docs.map(d =>
          d.rowId === rowKey
            ? {
                ...d,
                documentId: uploadedDoc.documentId,
                filePath: null,
                fileName: uploadedDoc.fileName,
                isUploading: false,
              }
            : d,
        ),
      );

      // The old file is gone for good now; let the reconcile have it.
      unpinOutgoing();
      toast.success(t('toasts.documentReplaced'));
    } catch (error) {
      // Revert to an original document on error
      updateDocument(
        entityType,
        entityIndex,
        docType,
        docs => docs.map(doc => (doc.rowId === rowKey ? currentDoc : doc)),
        false,
      );

      unpinOutgoing();
      toast.error(apiErrorDetail(error) || t('toasts.documentReplaceFailed'));
    }
  };

  // Starts an upload into a type. With an empty slot the file fills that row; without one (a type
  // that already has files, or a type with none and no slot) it becomes a new row.
  const startUpload = (row: TypeRow, entityType: 'request' | 'title', entityIndex: number) => {
    setUploadingToDocument({
      docType: row.documentType,
      docKey: row.slot ? documentKey(row.slot) : null,
      required: row.required,
      entityType,
      entityIndex,
    });
    uploadFileInputRef.current?.click();
  };

  // A type for this title beyond its asked-for ones. Its own empty slot, if it has one, takes the
  // first file (so a required row is filled, not left empty beside a new one); otherwise a new row.
  // The picker opens in this click: a picker opened after the dialog has closed is blocked by Safari.
  const chooseOtherType = (docType: string) => {
    if (!scope) return;
    const slot = getTitleDocuments(scope.titleIndex).find(
      doc => doc.documentType === docType && !doc.fileName,
    );
    setUploadingToDocument({
      docType,
      docKey: slot ? documentKey(slot) : null,
      required: slot?.isRequired ?? false,
      entityType: 'title',
      entityIndex: scope.titleIndex,
    });
    setAddOtherOpen(false);
    uploadFileInputRef.current?.click();
  };

  /**
   * One or several files into a type's row. The first fills the row's empty slot (keeping its
   * metadata), the others are rows of their own. Every row shows as uploading at once; the files
   * go up three at a time, and one that fails leaves the rest alone.
   */
  const handleUploadFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    // Read before the reset: the list is live
    e.target.value = '';
    if (picked.length === 0 || !uploadingToDocument) return;

    const { docType, docKey, required, entityType, entityIndex } = uploadingToDocument;
    // Reset upload state early
    setUploadingToDocument(null);

    const { valid, skipped } = splitUploadable(picked, MAX_UPLOAD_BYTES);
    if (skipped.length > 0) {
      toast.error(
        t('toasts.uploadFilesSkipped', {
          n: skipped.length,
          names: skipped.map(item => item.file.name).join(', '),
        }),
      );
    }
    if (valid.length === 0) return;

    // The empty row the first file fills; null when it is added as a new row
    const firstSlot = docKey === null ? null : getEmptySlot(entityType, entityIndex, docKey);
    if (docKey !== null && !firstSlot) {
      // The slot is gone (the row was filled, moved or removed since the picker opened); with no
      // slot to receive it, the file would replace nothing or the wrong row.
      toast(t('toasts.uploadSlotGone'));
      return;
    }

    // Every file's row goes into the form now; what each one still has to do is a task for later
    const tasks = valid.map((file, at) =>
      prepareUpload(file, at === 0 ? firstSlot : null, {
        docType,
        required,
        entityType,
        entityIndex,
        quiet: valid.length > 1,
      }),
    );
    const results = await runLimited(tasks);
    // A single file says so itself; several say it once
    const done = results.filter(Boolean).length;
    if (valid.length > 1 && done > 0) toast.success(t('toasts.uploadSuccess', { n: done }));
  };

  /**
   * Puts one file's row into the form (uploading) and returns the task that sends it. The task
   * settles to whether the file went up; it never throws.
   */
  const prepareUpload = (
    file: File,
    slot: UploadedDocument | null,
    target: {
      docType: string;
      required: boolean;
      entityType: 'request' | 'title';
      entityIndex: number;
      quiet: boolean;
    },
  ): (() => Promise<boolean>) => {
    const { docType, required, entityType, entityIndex, quiet } = target;
    // The row is found by its key from here on, so a second row of the same type is never touched
    const flight = startInFlight(
      entityType === 'request' ? getRequestDocuments() : getTitleDocuments(entityIndex),
      slot,
    );
    const rowKey = flight.key;
    const slotNow = flight.slot;

    // Create new document with file data
    const tempDocument = makeUploadedRow({
      id: slotNow?.id || null,
      // A new row in a title section belongs to that title, like a moved or restored file does
      titleId:
        slotNow?.titleId || (entityType === 'title' ? (titles[entityIndex]?.id ?? null) : null),
      documentType: docType || null,
      fileName: file.name,
      prefix: slotNow?.prefix || null,
      notes: slotNow?.notes || null,
      isRequired: slotNow?.isRequired ?? required,
      uploadedBy: currentUser?.username || 'anonymous',
      uploadedByName: currentUser?.name || 'Anonymous',
      file,
      isUploading: true,
      displayName: slotNow?.displayName,
      rowId: rowKey,
    });

    // Takes the upload back out: the slot returns, or the row added for it goes
    const revert = (docs: UploadedDocument[]) => revertInFlight(docs, flight);

    // Update document with uploading state
    updateDocument(
      entityType,
      entityIndex,
      docType,
      docs => placeInFlight(docs, flight, tempDocument),
      false,
    );

    return async () => {
      let sessionId: string;
      try {
        // Get or create an upload session
        sessionId = await getOrCreateSession();
      } catch (error) {
        // Session creation failed
        updateDocument(entityType, entityIndex, docType, revert, false);
        toast.error(apiErrorDetail(error) || t('toasts.sessionFailed'));
        return false;
      }

      try {
        // Upload file with session
        const uploadedDoc = await uploadDocument({
          uploadSessionId: sessionId,
          file,
          documentType: docType,
          documentCategory: getDocumentCategory(docType),
        });
        updateDocument(entityType, entityIndex, docType, docs =>
          docs.map(doc =>
            doc.rowId === rowKey
              ? {
                  ...doc,
                  documentId: uploadedDoc.documentId,
                  fileName: uploadedDoc.fileName,
                  isUploading: false,
                }
              : doc,
          ),
        );

        if (!quiet) toast.success(t('toasts.documentUploaded'));
        return true;
      } catch (error) {
        updateDocument(entityType, entityIndex, docType, revert, false);
        toast.error(apiErrorDetail(error) || t('toasts.documentUploadFailed'));
        return false;
      }
    };
  };

  /**
   * "Generate" on the D035 row: the system's appointment letter becomes a file of that row. If the
   * row already has files, the maker is asked first: it replaces the earlier generated letters (the
   * rest stay), or, when none of the files is one, all of them.
   */
  const handleGenerate = (row: TypeRow) => {
    if (!requestId) {
      toast(t('appointmentLetter.saveFirst'));
      return;
    }
    if (appointment.busy) return;
    // A file still on its way up is not replaced: it would land on a row that is gone
    const settled = row.files.filter(file => !file.isUploading);
    if (settled.length === 0) {
      void runGenerate(row, []);
      return;
    }
    const earlier = settled.filter(isGeneratedAppointmentLetter);
    setGenerateConfirm({
      row,
      keys: (earlier.length > 0 ? earlier : settled).map(documentKey),
      generated: earlier.length > 0,
    });
  };

  const runGenerate = async (row: TypeRow, replaceKeys: string[]) => {
    // Fills the row's empty slot when it has no file, to keep its metadata; else it is a new row
    const flight = startInFlight(getRequestDocuments(), row.files.length === 0 ? row.slot : null);
    const slot = flight.slot;
    const rowKey = flight.key;
    const pending = makeUploadedRow({
      id: slot?.id ?? null,
      documentType: APPOINTMENT_LETTER_DOC_TYPE,
      fileName: APPOINTMENT_LETTER_FILE,
      prefix: slot?.prefix ?? null,
      isRequired: slot?.isRequired ?? row.required,
      uploadedBy: currentUser?.username ?? null,
      uploadedByName: currentUser?.name ?? null,
      isUploading: true,
      displayName: slot?.displayName ?? row.displayName,
      rowId: rowKey,
    });
    const docType = APPOINTMENT_LETTER_DOC_TYPE;
    // The row shows the letter on its way, as it does for an upload
    updateDocument('request', -1, docType, docs => placeInFlight(docs, flight, pending), false);
    const letter = await appointment.generate();
    if (!letter) {
      // Takes the pending letter back out: the slot returns, or the row added for it goes
      updateDocument('request', -1, docType, docs => revertInFlight(docs, flight), false);
      return;
    }
    const replaced = new Set(replaceKeys);
    updateDocument('request', -1, docType, docs =>
      docs
        .filter(doc => doc.rowId === rowKey || !replaced.has(documentKey(doc)))
        .map(doc =>
          doc.rowId === rowKey
            ? {
                ...doc,
                documentId: letter.documentId,
                fileName: letter.fileName,
                file: letter.file,
                isUploading: false,
              }
            : doc,
        ),
    );
    toast.success(
      t('appointmentLetter.attached', 'Appointment letter attached. Save the request to keep it.'),
    );
  };

  const handleView = (document: UploadedDocument) => {
    if (document.file) {
      // Not uploaded yet, so there is nothing to fetch and nothing to wait for: the bytes are
      // already on this machine and the tab can be pointed straight at them. The URL is reused
      // across previews of the same file and released by reconcilePreviews once the file leaves
      // the form — one left registered keeps the whole File alive for the rest of the session.
      const existing = localPreviewUrls.current.get(document.file);
      const url = existing?.url ?? URL.createObjectURL(document.file);
      localPreviewUrls.current.set(document.file, { url, pinned: existing?.pinned });

      // Opened empty first, then pointed at the blob — the same two steps loadingTab uses, and for
      // two reasons. `window.open(url, ..., 'noopener')` returns null by specification whether the
      // tab opened or not, so a blocked pop-up cannot be told from a successful one; and the
      // opener link still has to be severed, because a blob URL is same-origin with the app and an
      // .html or .svg someone attaches would otherwise hold a live handle on this window.
      const preview = window.open('', '_blank');
      if (!preview) {
        toast.error(t('common:documentViewer.popupBlocked'));
        return;
      }
      preview.opener = null;
      preview.location.href = url;
    } else if (document.documentId) {
      // Stored on the server: the shared viewer opens the tab inside this click (Safari) and owns
      // the loading page, the progress and the error from there.
      viewDocument(document.documentId);
    } else if (document.filePath) {
      // Fallback to filePath
      window.open(document.filePath, '_blank', 'noopener');
    }
  };

  // Ticks or unticks every file of a type row
  const toggleFiles = (
    entityType: 'request' | 'title',
    entityIndex: number,
    files: UploadedDocument[],
    checked: boolean,
  ) => {
    setSelectedDocuments(prev => {
      const next = new Set(prev);
      for (const file of files) {
        if (file.isUploading) continue;
        const id = getDocumentId(entityType, entityIndex, documentKey(file));
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (ids: string[], checked: boolean) => {
    setSelectedDocuments(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  // A file picked in the list or the pane
  const handleSaveNotes = (doc: UploadedDocument, notes: string) => {
    if (!selectedFile) return;
    const { entityType, entityIndex } = selectedFile;
    const key = documentKey(doc);
    updateDocument(entityType, entityIndex, doc.documentType || '', docs =>
      docs.map(d => (documentKey(d) === key ? { ...d, notes: notes.trim() || null } : d)),
    );
    toast.success(t('toasts.documentDetailsUpdated'));
  };

  const handleBulkDelete = () => {
    if (selectedDocuments.size === 0) return;
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    let deletedCount = 0;
    let clearedCount = 0;

    selectedDocuments.forEach(docId => {
      const [entityType, entityIndexStr, docKey] = docId.split('|');
      const entityIndex = parseInt(entityIndexStr);

      const docs =
        entityType === 'request' ? getRequestDocuments() : getTitleDocuments(entityIndex);
      // A row that is gone (removed some other way since it was ticked) is nothing to delete
      if (!docs.some(doc => documentKey(doc) === docKey)) return;
      // A required row keeps an empty slot only when it is the last of its type (see removeFiles),
      // so what was removed and what was left as an empty slot is read off the result
      const next = removeFiles(docs, doc => documentKey(doc) === docKey);
      updateDocument(entityType as 'request' | 'title', entityIndex, docKey, () => next);
      if (next.length < docs.length) deletedCount++;
      else clearedCount++;
    });

    setSelectedDocuments(new Set());
    setBulkDeleteConfirm(false);

    // Show appropriate message
    if (clearedCount + deletedCount === 0) return;
    if (clearedCount > 0 && deletedCount > 0) {
      toast.success(t('toasts.bulkDeleted', { deleted: deletedCount, cleared: clearedCount }));
    } else if (clearedCount > 0) {
      toast.success(t('toasts.bulkCleared', { n: clearedCount }));
    } else {
      toast.success(t('toasts.bulkDeletedSimple', { n: deletedCount }));
    }
  };

  const sections = generateDocumentSections();
  // While it can be edited, the request always offers the appointment letter row, whether or not
  // its checklist lists D035 (read-only shows only what the request holds)
  const offersLetter = (section: { entityType: string }) =>
    section.entityType === 'request' && !isReadOnly;
  const sectionRows = sections.map(section => {
    const rows = groupByType(section.documents);
    return offersLetter(section) ? withTypeRow(rows, APPOINTMENT_LETTER_DOC_TYPE) : rows;
  });
  const totals = kpis(sectionRows);
  // The type's own name in the UI language; the row's displayName (the checklist's English name,
  // kept on the form row) only stands in for a type the list does not have.
  const nameOfType = (code: string, displayName?: string | null) =>
    documentTypes.some(dt => dt.code === code)
      ? getDocumentTypeName(documentTypes, code)
      : displayName || code;
  const typeName = (row: TypeRow) => nameOfType(row.documentType, row.displayName);
  // What a search matches: the name shown, and the type's other name too
  const searchText = (row: TypeRow) =>
    `${typeName(row)} ${getDocumentTypeSearchText(documentTypes, row.documentType)}`;

  // Rows stamped PREV came from the previous appraisal (persisted, so this holds after a reload).
  // The endpoint is only needed to tell which of its files are no longer in the form; when it
  // cannot be loaded the badge still shows and the unused list is simply absent.
  const { used: carriedUsed, unused: carriedUnused } = deriveCarryForward(
    carryOn ? (carryData?.documents ?? []) : [],
    getRequestDocuments(),
    titles,
  );
  const carriedNumber = carryData?.appraisalNumber ?? prevAppraisalReportNo ?? '';

  // "D013 · Deed" for the file shown in the section chooser
  const typeLabelOf = (code: string | null | undefined) =>
    code ? `${code} · ${nameOfType(code)}` : undefined;
  // One row of the section chooser: the section's own label (the helper every list uses), and under
  // it where the title is and whose it is. A title with the carried file's key is marked as its own.
  const targetOf = (
    section: { entityType: 'request' | 'title'; entityIndex: number; entityKey: string },
    doc?: CarryForwardDocument,
  ): MoveTargetSection => {
    if (section.entityType === 'request')
      return {
        entityType: 'request',
        entityIndex: section.entityIndex,
        label: t('moveDocument.requestLevelLabel'),
        detail: t('moveDocument.requestLevelHint'),
      };
    const form = getValues(`titles.${section.entityIndex}`) as
      | {
          ownerName?: string | null;
          titleAddress?: { districtName?: string; provinceName?: string };
        }
      | undefined;
    const place = [form?.titleAddress?.districtName, form?.titleAddress?.provinceName]
      .filter(Boolean)
      .join(' ');
    const docKey = doc?.level === 'Title' ? titleKey(doc.collateralType, doc.titleNumber) : null;
    return {
      entityType: 'title',
      entityIndex: section.entityIndex,
      label: section.entityKey,
      detail: [place, form?.ownerName].filter(Boolean).join(' · ') || undefined,
      matches: !!docKey && formTitleKey(titles[section.entityIndex]) === docKey,
    };
  };

  const selectedSection = selectedFile
    ? sections.find(
        section =>
          section.entityType === selectedFile.entityType &&
          section.entityIndex === selectedFile.entityIndex,
      )
    : undefined;
  const selectedDoc =
    selectedFile && selectedSection
      ? (selectedSection.documents.find(
          doc => documentKey(doc) === selectedFile.docKey && doc.fileName,
        ) ?? null)
      : null;

  const isFiltering = listQuery.query.trim() !== '' || listQuery.filter !== 'all';
  // A search or filter opens every section that has a match, whatever was closed by hand: it is
  // looking inside them. Otherwise the maker's own choice wins, else the default: with many titles
  // the title sections start closed (the request's never does) so that hundreds of rows are not
  // mounted up front.
  function isCollapsedKey(state: ReadonlyMap<string, boolean>, key: string) {
    if (isFiltering) return false;
    return state.get(key) ?? (closedByDefault.current === true && key !== 'request');
  }
  const missingCount = sectionRows.flat().filter(row => row.status === 'miss').length;

  // Files can be dropped anywhere on the card: the bar's own dialog flow takes them from here
  const editable = !isReadOnly;
  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes('Files');

  // What each section shows now, so "select all" and the render agree on what is on screen
  const views = sections.map((section, i) => {
    const rows = sectionRows[i];
    return {
      section,
      rows,
      key: section.sectionKey,
      ...(offersLetter(section)
        ? // …as a full row, never folded into the line of empty types
          alwaysShowType(rows, filterRows(rows, listQuery, searchText), APPOINTMENT_LETTER_DOC_TYPE)
        : filterRows(rows, listQuery, searchText)),
    };
  });
  // The files of the rows on screen (sections that are open, after search and filters)
  const onScreenIds = views
    .filter(view => !isCollapsedKey(sectionState, view.key))
    .flatMap(view =>
      view.shown.flatMap(row =>
        // Only the chips on screen: files folded into "+N" are not selected by select-all
        visibleFiles(row.files, expandedRows.has(`${view.key}|${row.documentType}`))
          .filter(file => !file.isUploading)
          .map(file =>
            getDocumentId(view.section.entityType, view.section.entityIndex, documentKey(file)),
          ),
      ),
    );
  const pickedOnScreen = onScreenIds.filter(id => selectedDocuments.has(id)).length;

  // A ticked file that is no longer in the form (Don't use, delete, move, a re-pick or a clear that
  // dropped it) must not stay in the selection: the bulk bar would count it and a bulk delete
  // would write to the form for nothing.
  const liveFileIds = sections
    .flatMap(section =>
      section.documents
        .filter(doc => doc.fileName)
        .map(doc => getDocumentId(section.entityType, section.entityIndex, documentKey(doc))),
    )
    .join('\n');
  useEffect(() => {
    const live = new Set(liveFileIds.split('\n'));
    setSelectedDocuments(prev => {
      const next = new Set([...prev].filter(id => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [liveFileIds]);

  // What the sections call. The object never changes, so a section whose data did not change does
  // not render; each call goes to the handlers of the latest render.
  const latestActions = useRef<SectionActions | null>(null);
  latestActions.current = {
    toggleSection,
    upload: startUpload,
    toggleFiles,
    toggleExpanded: rowKey =>
      setExpandedRows(prev => {
        const next = new Set(prev);
        if (next.has(rowKey)) next.delete(rowKey);
        else next.add(rowKey);
        return next;
      }),
    select: (entityType, entityIndex, docKey) => {
      if (!scoped) return setSelectedFile({ entityType, entityIndex, docKey });
      // No side pane in the title editor: a click opens the file
      const file = getTitleDocuments(entityIndex).find(
        d => documentKey(d) === docKey && d.fileName,
      );
      if (file) handleView(file);
    },
    view: handleView,
    edit: handleEdit,
    move: handleMove,
    replace: (doc, entityType, entityIndex) => handleReplace(doc, entityType, entityIndex),
    remove: handleDelete,
    generate: handleGenerate,
  };
  const sectionActions = useMemo<SectionActions>(() => {
    const at = () => latestActions.current as SectionActions;
    return {
      // Move needs every section as a target, and the title editor has one
      ...(scoped
        ? {}
        : {
            move: (...args: Parameters<NonNullable<SectionActions['move']>>) =>
              at().move?.(...args),
          }),
      toggleSection: (...args) => at().toggleSection(...args),
      upload: (...args) => at().upload(...args),
      toggleFiles: (...args) => at().toggleFiles(...args),
      toggleExpanded: (...args) => at().toggleExpanded(...args),
      select: (...args) => at().select(...args),
      view: (...args) => at().view(...args),
      edit: (...args) => at().edit?.(...args),
      replace: (...args) => at().replace?.(...args),
      remove: (...args) => at().remove?.(...args),
      generate: (...args) => at().generate?.(...args),
    };
  }, [scoped]);

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
        <section
          className={clsx(
            'min-w-0 bg-white',
            // Scoped (a title's drawer): the drawer's own box is the frame, so none here
            scoped ? 'rounded-none' : 'rounded-t-2xl rounded-b-none border shadow-sm',
            !scoped &&
              (isDraggingOver ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100'),
          )}
          onDragOver={e => {
            if (scoped || !editable || !isFileDrag(e)) return;
            e.preventDefault();
          }}
          // Capture phase: the nested drop bar stops these events from bubbling, so the card
          // would otherwise miss a drag moving over the bar, or leaving the card through it.
          onDragOverCapture={e => {
            if (!scoped && editable && isFileDrag(e)) setIsDraggingOver(true);
          }}
          onDragLeaveCapture={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDraggingOver(false);
          }}
          onDropCapture={() => setIsDraggingOver(false)}
          onDrop={e => {
            if (scoped || !editable || !isFileDrag(e)) return;
            e.preventDefault();
            uploadBarRef.current?.addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          {!scoped && (
            <>
              <DocumentCardHeader kpis={totals} />

              {carryOn &&
                prevAppraisalId &&
                onRetryCarryForward &&
                carryLoadFailed &&
                !carryData && (
                  <div className="px-4 pb-1">
                    <CarryForwardLoadError
                      retrying={carryFetching || carryBusy}
                      onRetry={onRetryCarryForward}
                    />
                  </div>
                )}

              {canDontUse && (
                <div className="px-4 pb-1">
                  <CarryForwardSummary
                    number={carriedNumber}
                    usedCount={carriedUsed.length}
                    unused={carriedUnused}
                    onRestore={handleRestoreCarried}
                    getDocTypeName={code => getDocumentTypeName(documentTypes, code)}
                  />
                </div>
              )}

              <DocumentToolbar
                query={listQuery.query}
                onQuery={query => setListQuery(prev => ({ ...prev, query }))}
                filter={listQuery.filter}
                onFilter={filter => setListQuery(prev => ({ ...prev, filter }))}
                missingCount={missingCount}
                followUpCount={totals.followUps}
                selectAll={
                  editable
                    ? {
                        checked: onScreenIds.length > 0 && pickedOnScreen === onScreenIds.length,
                        indeterminate: pickedOnScreen > 0 && pickedOnScreen < onScreenIds.length,
                        disabled: onScreenIds.length === 0,
                        onChange: checked => handleSelectAll(onScreenIds, checked),
                      }
                    : undefined
                }
                onExpandAll={
                  isFiltering
                    ? undefined
                    : () => setSectionState(new Map(views.map(view => [view.key, false])))
                }
                onCollapseAll={
                  isFiltering
                    ? undefined
                    : () => setSectionState(new Map(views.map(view => [view.key, true])))
                }
                previewToggle={
                  cardIsWide
                    ? {
                        shown: paneShown,
                        // Hiding just hides: no file stays selected behind it, so no slide-over opens
                        onToggle: () => {
                          if (paneShown) setSelectedFile(null);
                          togglePane();
                        },
                      }
                    : undefined
                }
              />

              {selectedDocuments.size > 0 && editable && (
                <div className="flex flex-wrap items-center gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm">
                  <Icon name="circle-check" style="solid" className="size-3.5 text-primary" />
                  <span className="font-medium text-primary">
                    {t('docCard.bulk.selected', { n: selectedDocuments.size })}
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={handleBulkDelete}>
                    <Icon name="trash" style="solid" className="mr-1 size-3 text-red-600" />
                    {t('docCard.bulk.delete')}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedDocuments(new Set())}
                    className="cursor-pointer text-primary underline underline-offset-2"
                  >
                    {t('docCard.bulk.clear')}
                  </button>
                </div>
              )}

              {editable && (
                <CreateRequestFileInput
                  ref={uploadBarRef}
                  getOrCreateSession={getOrCreateSession}
                />
              )}
            </>
          )}

          {/* A title's drawer: the same section header as the drawer's other sections, the count of
              types with files on its right. The box below frames the rows; the first row has no top
              border of its own. */}
          {scoped && (
            <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-gray-100 pb-1.5">
              <h3 className="m-0 text-sm font-semibold text-gray-800">{scope.heading}</h3>
              <span className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {t('docCard.section.typesWithFiles', {
                    filled: sectionStats(sectionRows[0]).filled,
                    total: sectionStats(sectionRows[0]).types,
                  })}
                </span>
                {editable && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="bg-primary/10! text-primary! hover:bg-primary/15!"
                    leftIcon={<Icon style="solid" name="plus" className="text-xs" />}
                    onClick={() => setAddOtherOpen(true)}
                  >
                    {t('docCard.addOther.button')}
                  </Button>
                )}
              </span>
            </div>
          )}

          <div className={scoped ? 'overflow-hidden rounded-lg border border-gray-200' : undefined}>
            {views.map(({ section, rows, shown, hidden, key: sectionKey }) => {
              // A search or filter leaves out a section with nothing to show
              if (isFiltering && shown.length === 0 && hidden.length === 0) return null;
              renderedSections++;
              const { entityType, entityIndex } = section;
              // A closed section is its header: its rows are not built, let alone mounted
              const collapsed = !scoped && isCollapsedKey(sectionState, sectionKey);

              return (
                <DocumentSection
                  key={sectionKey}
                  sectionKey={sectionKey}
                  entityType={entityType}
                  entityIndex={entityIndex}
                  label={section.entityKey}
                  stats={sectionStats(rows)}
                  collapsed={collapsed}
                  locked={isFiltering}
                  editable={editable}
                  readOnly={isReadOnly}
                  headerless={scoped}
                  bulk={!scoped}
                  isEmpty={rows.length === 0}
                  items={
                    collapsed
                      ? []
                      : shown.map(row => ({
                          row,
                          name: typeName(row),
                          selectedCount: row.files.filter(file =>
                            selectedDocuments.has(
                              getDocumentId(entityType, entityIndex, documentKey(file)),
                            ),
                          ).length,
                          expanded: expandedRows.has(`${sectionKey}|${row.documentType}`),
                          // The appointment letter is made by the system, not just attached
                          generate:
                            editable &&
                            entityType === 'request' &&
                            row.documentType === APPOINTMENT_LETTER_DOC_TYPE,
                          // The letter is made for a saved request
                          generateDisabledReason: requestId
                            ? undefined
                            : t('appointmentLetter.saveFirst'),
                          carried: row.files.map(file => carryOn && isCarried(file)),
                          dontUse: row.files.map(canDontUseRow),
                        }))
                  }
                  emptyTypes={collapsed ? [] : hidden.map(row => ({ row, name: typeName(row) }))}
                  selectedDocKey={
                    selectedFile?.entityType === entityType &&
                    selectedFile.entityIndex === entityIndex
                      ? selectedFile.docKey
                      : null
                  }
                  carriedNumber={carriedNumber}
                  actions={sectionActions}
                  getDocKey={documentKey}
                />
              );
            })}
            {renderedSections === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                {isFiltering ? t('docCard.noMatch') : t('empty.noDocuments')}
              </div>
            )}
          </div>
        </section>

        {showSidePane && (
          <DocumentPreviewPane
            variant="side"
            docKey={selectedFile?.docKey}
            doc={selectedDoc}
            documentType={selectedDoc?.documentType ?? ''}
            typeName={
              selectedDoc ? nameOfType(selectedDoc.documentType ?? '', selectedDoc.displayName) : ''
            }
            location={selectedSection?.entityKey ?? ''}
            carriedFrom={selectedDoc && carryOn && isCarried(selectedDoc) ? carriedNumber : null}
            dontUse={!!selectedDoc && canDontUseRow(selectedDoc)}
            editable={editable}
            onClose={() => setSelectedFile(null)}
            onView={handleView}
            onSaveNotes={handleSaveNotes}
            onReplace={d =>
              selectedFile && handleReplace(d, selectedFile.entityType, selectedFile.entityIndex)
            }
            onMove={d =>
              selectedFile && handleMove(d, selectedFile.entityType, selectedFile.entityIndex)
            }
            onDelete={d =>
              selectedFile && handleDelete(d, selectedFile.entityType, selectedFile.entityIndex)
            }
          />
        )}
      </div>

      {/* Narrow card, or the side pane collapsed: a picked file opens the same content in a slide-over.
          An action that opens a dialog of its own closes the slide-over first, so the two never
          fight over focus. */}
      {!scoped && (
        <SlideOverPanel
          isOpen={!showSidePane && selectedDoc !== null}
          onClose={() => setSelectedFile(null)}
          title={selectedDoc?.fileName ?? ''}
          width="md"
          afterLeave={runDrawerAction}
        >
          {editable && (
            <input
              ref={drawerReplaceInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleReplaceFileSelected}
            />
          )}
          {selectedDoc && selectedFile && (
            <DocumentPreviewPane
              variant="drawer"
              docKey={selectedFile.docKey}
              doc={selectedDoc}
              documentType={selectedDoc.documentType ?? ''}
              typeName={nameOfType(selectedDoc.documentType ?? '', selectedDoc.displayName)}
              location={selectedSection?.entityKey ?? ''}
              carriedFrom={carryOn && isCarried(selectedDoc) ? carriedNumber : null}
              dontUse={canDontUseRow(selectedDoc)}
              editable={editable}
              onClose={() => setSelectedFile(null)}
              onView={handleView}
              onSaveNotes={handleSaveNotes}
              onReplace={d =>
                handleReplace(
                  d,
                  selectedFile.entityType,
                  selectedFile.entityIndex,
                  drawerReplaceInputRef,
                )
              }
              onMove={d =>
                afterDrawerCloses(() =>
                  handleMove(d, selectedFile.entityType, selectedFile.entityIndex),
                )
              }
              onDelete={d =>
                afterDrawerCloses(() =>
                  handleDelete(d, selectedFile.entityType, selectedFile.entityIndex),
                )
              }
            />
          )}
        </SlideOverPanel>
      )}

      {/* Hidden file input for replace functionality */}
      {!isReadOnly && (
        <input
          ref={replaceFileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleReplaceFileSelected}
        />
      )}

      {/* Hidden file input for upload to slot functionality */}
      {!isReadOnly && (
        <input
          ref={uploadFileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleUploadFileSelected}
        />
      )}

      {scoped && editable && (
        <AddTitleDocumentModal
          isOpen={addOtherOpen}
          onClose={() => setAddOtherOpen(false)}
          onChoose={chooseOtherType}
        />
      )}

      {/* Edit modal */}
      {editingDocument && (
        <DocumentEditModal
          isOpen={true}
          onClose={() => setEditingDocument(null)}
          document={editingDocument.document}
          onSave={handleSaveEdit}
        />
      )}

      {/* Where a carried title file goes when its title cannot be found by key */}
      {restoreChooser && (
        <MoveDocumentModal
          isOpen={true}
          onClose={() => setRestoreChooser(null)}
          title={t('carryForward.place.title')}
          description={t('carryForward.place.description')}
          confirmText={t('carryForward.place.confirm')}
          file={{
            fileName: restoreChooser.fileName,
            typeLabel: [
              typeLabelOf(restoreChooser.suggestedType),
              carriedTitleRef(t, restoreChooser),
            ]
              .filter(Boolean)
              .join(' · '),
            fromLabel: carriedNumber
              ? t('carryForward.place.fromPrevious', { number: carriedNumber })
              : undefined,
          }}
          targets={sections.map(section => targetOf(section, restoreChooser))}
          onConfirm={target => {
            restoreInto(restoreChooser, target);
            setRestoreChooser(null);
          }}
        />
      )}

      {/* Move document modal */}
      {movingDocument && (
        <MoveDocumentModal
          isOpen={true}
          onClose={() => setMovingDocument(null)}
          file={{
            fileName: movingDocument.document.fileName ?? '',
            typeLabel: typeLabelOf(movingDocument.document.documentType),
          }}
          targets={sections
            .filter(
              s =>
                !(
                  s.entityType === movingDocument.entityType &&
                  s.entityIndex === movingDocument.entityIndex
                ),
            )
            .map(s => targetOf(s))}
          onConfirm={performMove}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({
            isOpen: false,
            document: null,
            entityType: 'request',
            entityIndex: -1,
          })
        }
        onConfirm={confirmDelete}
        title={t('confirm.deleteDocumentTitle')}
        message={t('confirm.deleteDocumentMessage')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />

      {/* Generating the appointment letter over files the row already has */}
      <ConfirmDialog
        isOpen={generateConfirm !== null}
        onClose={() => setGenerateConfirm(null)}
        onConfirm={() => {
          const pending = generateConfirm;
          setGenerateConfirm(null);
          if (pending) void runGenerate(pending.row, pending.keys);
        }}
        title={t('appointmentLetter.confirmTitle')}
        message={
          generateConfirm?.generated
            ? t('appointmentLetter.confirmGenerated')
            : t('appointmentLetter.confirmFiles')
        }
        confirmText={t('appointmentLetter.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />

      {/* Bulk delete confirmation dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title={t('confirm.bulkDeleteTitle')}
        message={t('confirm.bulkDeleteMessage', { n: selectedDocuments.size })}
        confirmText={t('confirm.bulkDeleteConfirm')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </>
  );
};

const MemoCard = memo(DocumentCard);

/**
 * The document card. It owns the one subscription to the form's titles and passes them down, so it
 * can hold the card still: while the title editor is open the card is covered and the titles change
 * on every key typed there, so the card keeps the last titles it had (this wrapper renders, the
 * card does not) and picks up the current ones the moment the editor closes.
 */
const DocumentUploader: React.FunctionComponent<DocumentUploaderProps> = props => {
  const { control } = useFormContext();
  const live = useWatch({ control, name: 'titles', compute: pickCarryForwardTitles });
  const titleEditorOpen = useTitleEditorOpen();
  const shown = useRef(live);
  if (!titleEditorOpen) shown.current = live;
  return <MemoCard {...props} titles={shown.current ?? NO_TITLES} />;
};

type TitleDocumentsProps = Omit<DocumentUploaderProps, 'scope'> & {
  /** Index into the form's `titles`. */
  index: number;
  heading: string;
};

/**
 * One title's documents, for the title editor. Unlike the page card it is never held still: it
 * reads this title's rows live, by path, so a key typed in the editor's fields (which changes
 * other paths) does not re-render it, and an upload or a delete shows at once.
 */
export const TitleDocumentsSection = ({ index, heading, ...props }: TitleDocumentsProps) => {
  const { control } = useFormContext();
  const id = useWatch({ control, name: `titles.${index}.id` }) as string | null | undefined;
  const documents = useWatch({ control, name: `titles.${index}.documents` }) as
    | UploadedDocument[]
    | undefined;
  // The card finds the title by its index: the others stand in as empty slots
  const titles = useMemo<CarryForwardTitle[]>(() => {
    const list: CarryForwardTitle[] = Array.from({ length: index + 1 }, () => ({}));
    list[index] = { id, documents };
    return list;
  }, [index, id, documents]);
  const scope = useMemo(() => ({ titleIndex: index, heading }), [index, heading]);
  return <MemoCard {...props} titles={titles} scope={scope} />;
};

export default DocumentUploader;
