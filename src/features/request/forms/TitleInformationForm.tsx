import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { get, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import FormCard from '@/shared/components/sections/FormCard';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { NumberInput } from '@/shared/components/inputs';
import { useFormReadOnly } from '@/shared/components/form';
import { useAppealExclusionStore } from '@/features/collateralMaster/store/appealExclusionStore';
import { useCollateralPrefillStore } from '@/features/collateralMaster/store/collateralPrefillStore';
import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import { useAddressStore } from '@/shared/store';
import { RequestTitleDto, type RequestTitleDtoType } from '@/features/request/schemas/form';
import { useTitleLevelRequiredDocuments } from '../hooks/useRequiredDocuments';
import { TitleImportDialog } from '../components/TitleImportDialog';
import type { TitleImportRow } from '../api/titleImport';
import { blockedByRequestUploads } from '../utils/carryForward';
import { useRequestUploadBusy } from '../hooks/useRequestUploadBusy';
import type { UploadedDocument } from '../types/document';
import PriorAppraisalSummary from '../components/PriorAppraisalSummary';
import { TitleDrawer } from '../components/titles/TitleDrawer';
import { useTitleEditorStore } from '../store/titleEditorStore';
import { TitleAddMenu } from '../components/titles/TitleAddMenu';
import { TitleTable, TitleTableGroup, type RowActions } from '../components/titles/TitleTable';
import { TitleToolbar, type ChipOption } from '../components/titles/TitleToolbar';
import {
  useCollateralTypeName,
  useStableList,
  useTitlesSnapshot,
  useTitleStatus,
} from '../components/titles/titleHooks';
import {
  allowedCollateralCodes,
  estateTotals,
  filterIndices,
  hasActiveFilter,
  isEstateSortedByNumber,
  newTitle,
  orderByIds,
  NO_FILTER,
  groupSize,
  rankInGroup,
  slotInGroup,
  sortEstateByNumber,
  splitByGroup,
  titleFamily,
  withPlaceNames,
  type LocalityRecord,
  type TitleChip,
  type TitleFilter,
} from '../utils/titleList';

/**
 * Ceiling on one duplicate action.
 *
 * Not a performance limit — measured 2026-08-27, the form holds 300 imported titles with a detail
 * view opening in 0.8 s, and survives 600. It is about blast radius: one mistyped digit in a dialog
 * should not be able to produce hundreds of rows the user then has to delete one by one. A batch
 * that large belongs in a spreadsheet they can review before uploading.
 */
const MAX_DUPLICATE_COPIES = 100;

/** Empty or nonsense in the box means one copy; the ceiling is enforced here, not by the input. */
const clampCopies = (value: number | null | undefined) =>
  Math.min(Math.max(Math.trunc(value || 1), 1), MAX_DUPLICATE_COPIES);

/**
 * From this many titles the search and filter bar appears. Below it the rows are faster to read
 * than to filter, and the bar would be noise on the common one-to-three title request; from five up
 * a title is quicker to find by typing than by scrolling. It stays while a filter is active, so a
 * list that shrinks under it can never hide rows behind a filter with no bar to clear it.
 */
const TOOLBAR_MIN_TITLES = 5;

/** Families that get a filter chip when the request has at least one of them. */
const FILTER_FAMILIES = [
  'land',
  'landBuilding',
  'building',
  'condo',
  'vehicle',
  'machine',
  'vessel',
] as const;

const EMPTY: RequestTitleDtoType[] = [];

type TypeRow = ReturnType<typeof collateralTypesOf>[number];

/** The one toast that can undo a sort, so it can be dismissed when something would make it unsafe. */
const SORT_UNDO_TOAST = 'title-sort-undo';

/** A callback with a stable identity that always runs the latest closure, for memoised rows. */
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

/** What the editor needs to put a title back, or to drop one that was added and never filled in. */
interface EditSession {
  index: number;
  /** The title as it was when the editor opened on it. */
  original: RequestTitleDtoType;
  /** Added from the menu (or "save and add next") in this editor session. */
  isNew: boolean;
}

/** A title is untouched if nothing but its auto-created document placeholders differ from new. */
const withoutDocuments = (title: RequestTitleDtoType | undefined) =>
  JSON.stringify({ ...title, documents: undefined });

/** A file is attached (or on its way up): the title is worth keeping, however little else is in it. */
const hasFiles = (title: RequestTitleDtoType | undefined) =>
  ((title?.documents ?? []) as UploadedDocument[]).some(doc => doc.fileName || doc.isUploading);

/** Just the type of each title: all the drawer's "n of N" and the table a title sits in depend on. */
const collateralTypesOf = (titles: unknown) =>
  ((titles as RequestTitleDtoType[] | undefined) ?? []).map(title => ({
    collateralType: title?.collateralType ?? '',
  }));

/**
 * The title section takes only stable props, so it is memoised: the page root can re-render while
 * the form changes, and without this the section and its row initialisers would redo their work on
 * each keystroke in the open editor.
 */
interface TitleInformationFormProps {
  /** What the editor's documents list needs (see TitleDrawer); without them it has none. */
  getOrCreateSession?: () => Promise<string>;
  requestId?: string;
  showCarryForward?: boolean;
}

const TitleInformationForm = memo(function TitleInformationForm({
  getOrCreateSession,
  requestId,
  showCarryForward,
}: TitleInformationFormProps) {
  const documentUpload = useMemo(
    () => (getOrCreateSession ? { getOrCreateSession, requestId, showCarryForward } : undefined),
    [getOrCreateSession, requestId, showCarryForward],
  );
  const { t } = useTranslation(['request', 'common']);
  const isReadOnly = useFormReadOnly();
  const { control, getValues, setValue, trigger, formState } = useFormContext();
  const { fields, append, remove, move, insert, replace } = useFieldArray({
    control,
    name: 'titles',
  });
  const [session, setSession] = useState<EditSession | null>(null);
  // Properties the user confirmed as previously appraised: kept here, not in the drawer, so closing
  // and reopening it (or reordering rows) does not ask again. Lives as long as the page.
  const [acknowledgedPriors] = useState(() => new Set<string>());
  // The list stands still while the editor is open (see useTitlesSnapshot), and so does whatever
  // else on the page renders from the titles (see titleEditorStore).
  const editorOpen = session !== null;
  useEffect(() => {
    useTitleEditorStore.getState().setOpen(editorOpen);
  }, [editorOpen]);
  useEffect(
    () => () => {
      useTitleEditorStore.getState().setOpen(false);
      // The undo belongs to this form's array; one that outlives it (a draft saved from a new
      // request moves to another page instance) would undo nothing.
      toast.remove(SORT_UNDO_TOAST);
    },
    [],
  );
  const snapshot = useTitlesSnapshot(session !== null, session?.index);
  // A title just added is the array's last element and is not part of the list (rows, counts,
  // totals) until it is saved; closing, cancelling or leaving it blank means it never appeared.
  const pendingNew = !!session?.isNew && session.index === snapshot.length - 1;
  const titles = useMemo(
    () => (pendingNew ? snapshot.slice(0, -1) : snapshot),
    [snapshot, pendingNew],
  );
  const properties = useWatch({ name: 'properties', control });
  // Re-renders only when a title's type (hence its table or place) changes, not per keystroke.
  const typeRows = useWatch({ control, name: 'titles', compute: collateralTypesOf });
  const nameOfType = useCollateralTypeName();

  // Whatever still re-renders the list (a filter keystroke, a drop) renders at low priority.
  const listTitles = useDeferredValue(titles);
  const { sigs, missing } = useTitleStatus(listTitles);

  // A file is written back to its title by position, so while one is still uploading nothing may
  // move, insert or delete a title: the file would land on the wrong one, or the row stay stuck.
  // The rule is the one every row-moving action on the page follows, and the one blockedByUploads
  // below refuses by (useRequestUploadBusy): so the controls look locked exactly when they refuse.
  const orderLocked = useRequestUploadBusy();
  const blockedByUploads = useStableCallback(() =>
    blockedByRequestUploads(getValues, t('carryForward.toasts.waitForUploads')),
  );

  const [filter, setFilter] = useState<TitleFilter>(NO_FILTER);
  const [isImportOpen, setImportOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  // copies is nullable on purpose: the box is legitimately empty mid-edit, and coercing it back to
  // 1 on every keystroke makes NumberInput rewrite the display under the caret — backspace 5, see 1
  // reappear, type 2, and the field reads 12.
  const [duplicate, setDuplicate] = useState<{ index: number; copies: number | null } | null>(null);
  const [moveDialog, setMoveDialog] = useState<{ index: number; position: number | null } | null>(
    null,
  );

  // Reset cross-flow stores on mount so stale data from a previous request
  // creation doesn't leak into the current one (lookup-driven exclusions / prefill).
  useEffect(() => {
    useAppealExclusionStore.getState().clearExclusions();
    useCollateralPrefillStore.getState().clearPrefill();
  }, []);

  const allowed = useMemo(() => allowedCollateralCodes(properties), [properties]);

  // --- What is on screen ------------------------------------------------------------------
  const groups = useMemo(() => splitByGroup(listTitles), [listTitles]);
  const completeness = useMemo(() => missing.map(found => found.length === 0), [missing]);
  const estateGroup = useStableList(groups.estate);
  const movableGroup = useStableList(groups.movable);
  // A search reads place names, which a title loaded from the server only has once opened: look
  // them up the way the rows do (once per code), and only while there is something to search for.
  const searching = filter.query.trim() !== '';
  // The master may load after the list; a search then has the names to read.
  const titleMaster = useAddressStore(state => state.titleAddresses);
  const searchable = useMemo(() => {
    if (!searching) return listTitles;
    const found = new Map<string, LocalityRecord | undefined>();
    const find = (code: string) => {
      if (!found.has(code)) found.set(code, findAddressBySubDistrictCode(code, 'title'));
      return found.get(code);
    };
    return listTitles.map(title => withPlaceNames(title, find));
    // `titleMaster` is only a signal that the master changed; the lookup reads the store itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listTitles, searching, titleMaster]);
  const estateRows = useStableList(
    useMemo(
      () => filterIndices(searchable, estateGroup, filter, completeness),
      [searchable, estateGroup, filter, completeness],
    ),
  );
  const movableRows = useStableList(
    useMemo(
      () => filterIndices(searchable, movableGroup, filter, completeness),
      [searchable, movableGroup, filter, completeness],
    ),
  );
  const incompleteCount = completeness.filter(done => !done).length;
  const estateTotal = useMemo(
    () => estateTotals(listTitles, groups.estate),
    [listTitles, groups.estate],
  );
  const chips = useMemo<ChipOption[]>(() => {
    const perFamily = new Map<string, number>();
    for (const title of listTitles) {
      const family = titleFamily(title.collateralType);
      perFamily.set(family, (perFamily.get(family) ?? 0) + 1);
    }
    const options: ChipOption[] = [
      { chip: 'all', count: listTitles.length },
      { chip: 'incomplete', count: incompleteCount },
    ];
    for (const family of FILTER_FAMILIES) {
      const count = perFamily.get(family) ?? 0;
      if (count > 0) options.push({ chip: family as TitleChip, count });
    }
    return options;
  }, [listTitles, incompleteCount]);

  const filterActive = hasActiveFilter(filter);
  const showToolbar = listTitles.length >= TOOLBAR_MIN_TITLES || filterActive;
  const shown = estateRows.length + movableRows.length;
  const estateSorted = useMemo(() => isEstateSortedByNumber(listTitles), [listTitles]);

  // --- Editing ----------------------------------------------------------------------------
  const beginEdit = useStableCallback(
    (index: number, isNew: boolean, original?: RequestTitleDtoType) => {
      // An undo would reorder titles under the open editor, whose index (and what Cancel restores)
      // would then belong to a different title.
      toast.remove(SORT_UNDO_TOAST);
      setSession({
        index,
        isNew,
        original: structuredClone(
          original ?? (getValues(`titles.${index}`) as RequestTitleDtoType),
        ),
      });
    },
  );

  // A row on screen may belong to a list that has not caught up with a delete yet (see listIsStale).
  const openTitle = useStableCallback((index: number) => {
    if (!listIsStale()) beginEdit(index, false);
  });

  /** Removes the open title if it was added in this editor and nothing was typed into it. */
  const dropBlankNew = () => {
    if (!session?.isNew) return false;
    const current = getValues(`titles.${session.index}`) as RequestTitleDtoType | undefined;
    if (!current || withoutDocuments(current) !== withoutDocuments(session.original)) return false;
    // A file attached makes it touched, as typing does: it stays, incomplete, in the list
    if (hasFiles(current)) return false;
    remove(session.index);
    return true;
  };

  /**
   * A file of a title is still going up. The editor stays until it is done: leaving unmounts the
   * list that started it, and an upload is tied to the screen that began it (see useUploadDocument).
   */
  const waitForTitleUploads = () => {
    const all = (getValues('titles') as RequestTitleDtoType[] | undefined) ?? [];
    if (
      !all.some(title =>
        (title?.documents as UploadedDocument[] | undefined)?.some(doc => doc.isUploading),
      )
    )
      return false;
    toast(t('carryForward.toasts.waitForUploads'), { id: 'request-wait-for-uploads' });
    return true;
  };

  /** "Save" keeps the title whatever it holds, a blank new one included (it shows as incomplete). */
  const saveEditor = useStableCallback(() => {
    if (waitForTitleUploads()) return;
    setSession(null);
  });

  /** A new title with files, cancelled: asks first (the files would stay behind, unattached). */
  const [discardNew, setDiscardNew] = useState<{ files: number } | null>(null);

  /**
   * Puts back the fields of a title that differ from `original`, and only those. A field that is
   * already as it was is not written, so opening the editor and cancelling leaves the form exactly as
   * clean as it was (a write marks a field dirty against the loaded values, and a field the page
   * filled in silently after loading, such as the required document slots, differs from them). The
   * documents are never part of it: see below.
   */
  const restoreTitle = (index: number, original: RequestTitleDtoType) => {
    const current = (getValues(`titles.${index}`) ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(original)) {
      if (key === 'documents') continue;
      if (JSON.stringify(current[key]) === JSON.stringify(value)) continue;
      setValue(`titles.${index}.${key}`, value, { shouldDirty: true });
    }
  };

  /**
   * Back to how the title was when the editor opened; a title added here is dropped. This is every
   * way out of the editor except Save: Cancel, ✕, Esc and a click outside. Edits live in the form as
   * they are typed, so leaving without saving has to put them back.
   *
   * Moving to another title with Previous / Next is not leaving: it keeps the edits to the title
   * left behind (as Save would), and a later cancel puts back only the title open at that time.
   */
  const cancelEditor = useStableCallback(() => {
    if (!session) return;
    // Nothing was edited in a read-only editor, so there is nothing to put back.
    if (isReadOnly) {
      setSession(null);
      return;
    }
    if (waitForTitleUploads()) return;
    if (session.isNew) {
      const current = getValues(`titles.${session.index}`) as RequestTitleDtoType | undefined;
      if (hasFiles(current)) {
        setDiscardNew({
          files: ((current?.documents ?? []) as UploadedDocument[]).filter(doc => doc.fileName)
            .length,
        });
        return;
      }
      remove(session.index);
    } else
      // Back to the fields as they were, not the files: an upload that finished while the editor
      // was open belongs to the title and is not part of what "cancel" undoes. Set in place, not
      // with the field array's `update`, which would give the title a new id and so make it a
      // stranger to a pending sort undo.
      restoreTitle(session.index, session.original);
    setSession(null);
  });

  const addTitle = useStableCallback((code: string) => {
    // A filter would hide the new row from the list once the editor closes.
    setFilter(NO_FILTER);
    const created = newTitle(code);
    const index = (getValues('titles') as unknown[] | undefined)?.length ?? 0;
    append(created);
    beginEdit(index, true, created);
  });

  const confirmDiscardNew = useStableCallback(() => {
    if (!session) return;
    remove(session.index);
    setDiscardNew(null);
    setSession(null);
  });

  const saveAndAddNext = useStableCallback(() => {
    if (!session) return;
    if (waitForTitleUploads()) return;
    // As with every other way of adding a title: a filter would hide the new row once the editor closes.
    setFilter(NO_FILTER);
    const type = (getValues(`titles.${session.index}.collateralType`) as string) ?? '';
    const created = newTitle(type);
    const index = (getValues('titles') as unknown[] | undefined)?.length ?? 0;
    append(created);
    beginEdit(index, true, created);
  });

  // The array can be a render ahead of the type watch (an append); then read it directly.
  const typesNow =
    typeRows.length === fields.length ? typeRows : ((getValues('titles') ?? EMPTY) as TypeRow[]);

  // Previous / next follow the tables: the estate titles then the movable ones, as the live types
  // place them (the same view the editor's "n of N" has), narrowed to what an active filter shows.
  const navOrder = useMemo(() => {
    const { estate, movable } = splitByGroup(typesNow);
    const all = [...estate, ...movable];
    if (!filterActive) return all;
    const shownRows = new Set([...estateRows, ...movableRows]);
    return all.filter(index => shownRows.has(index));
  }, [typesNow, filterActive, estateRows, movableRows]);
  const navPos = session ? navOrder.indexOf(session.index) : -1;
  const goTo = (to: number | undefined) => {
    // The target comes from the live array, but never trust it past the end (a title just dropped).
    if (to === undefined || !session || to >= fields.length) return;
    // Leaving a blank new title this way drops it, as ✕ does; the titles after it then shift up.
    const original = structuredClone(getValues(`titles.${to}`)) as RequestTitleDtoType;
    if (dropBlankNew()) beginEdit(to > session.index ? to - 1 : to, false, original);
    else beginEdit(to, false);
  };

  // --- Order ------------------------------------------------------------------------------
  /**
   * The rows on screen come from a deferred copy of a snapshot, while move() and the dialogs act on
   * the live array: for the moment between a change and the list catching up, a row's index may no
   * longer be that title's. Nothing index-based runs until they agree.
   */
  const listIsStale = useStableCallback(
    () =>
      listTitles !== titles ||
      titles.length + (pendingNew ? 1 : 0) !==
        ((getValues('titles') as unknown[] | undefined)?.length ?? 0),
  );

  const moveTitle = useStableCallback((from: number, to: number) => {
    if (from === to || listIsStale() || blockedByUploads()) return;
    move(from, to);
  });

  const moveToEdge = useStableCallback((index: number, edge: 'top' | 'bottom') => {
    const { estate, movable } = splitByGroup(getValues('titles') as RequestTitleDtoType[]);
    const group = estate.includes(index) ? estate : movable;
    moveTitle(index, edge === 'top' ? group[0] : group[group.length - 1]);
  });

  // replace() leaves validation errors at the old positions; re-check so they follow the rows. A
  // submitted form re-checks the array by itself.
  const recheckErrors = () => {
    if (get(formState.errors, 'titles') && !formState.isSubmitted) void trigger('titles');
  };

  /**
   * Sort and undo set the whole array at once (`replace`): moving titles one by one makes the form
   * notify every field of every title per move. `replace` gives the titles new field-array ids, so
   * the undo cannot use the ids from before the sort. `perm[p]` is the old index of the title now at
   * place p; once the new ids are known (the effect below) the original order is written in them.
   */
  const sortUndo = useRef<{ perm: number[]; orderIds: string[] | null } | null>(null);
  useEffect(() => {
    const token = sortUndo.current;
    if (!token) return;
    if (!token.orderIds) {
      if (fields.length !== token.perm.length) return;
      const orderIds: string[] = [];
      token.perm.forEach((from, place) => {
        orderIds[from] = fields[place].id;
      });
      token.orderIds = orderIds;
      return;
    }
    // A reset (saving a draft does one) or a setValue on `titles` gives every title a new id; the
    // order saved in the old ones then means nothing and Undo would silently do nothing.
    const present = new Set(fields.map(field => field.id));
    if (!token.orderIds.some(id => present.has(id))) {
      toast.remove(SORT_UNDO_TOAST);
      sortUndo.current = null;
    }
  }, [fields]);

  /** Undo restores the order only: whatever was typed or uploaded in the meantime stays. */
  const undoSort = useStableCallback((token: { orderIds: string[] | null }) => {
    if (!token.orderIds || session || blockedByUploads()) return false;
    const current = getValues('titles') as RequestTitleDtoType[];
    if (current.length !== fields.length) return false;
    const ids = fields.map(field => field.id);
    replace(orderByIds(ids, token.orderIds).map(id => current[ids.indexOf(id)]));
    recheckErrors();
    return true;
  });

  const sortByNumber = useStableCallback(() => {
    if (session || blockedByUploads()) return;
    const current = getValues('titles') as RequestTitleDtoType[];
    if (current.length !== fields.length) return;
    const perm = sortEstateByNumber(
      current.map((title, index) => ({
        index,
        collateralType: title.collateralType,
        titleNumber: title.titleNumber,
      })),
    ).map(item => item.index);
    const token = { perm, orderIds: null as string[] | null };
    sortUndo.current = token;
    replace(perm.map(index => current[index]));
    recheckErrors();
    toast(
      toastInstance => (
        <span className="flex items-center gap-3">
          {t('titleSection.sort.done')}
          <button
            type="button"
            className="font-medium text-(--palette-primary-text) underline underline-offset-2"
            onClick={() => {
              // Stays up when nothing was undone (uploads running), so it can be tried again.
              if (undoSort(token)) toast.dismiss(toastInstance.id);
            }}
          >
            {t('titleSection.sort.undo')}
          </button>
        </span>
      ),
      { id: SORT_UNDO_TOAST, duration: 8000 },
    );
  });

  // --- Duplicate, delete, import ----------------------------------------------------------
  const confirmDelete = () => {
    if (deleteConfirm === null) return;
    // Uploads started after the dialog opened: say so and close it, rather than leave it looking dead.
    if (!blockedByUploads()) remove(deleteConfirm);
    setDeleteConfirm(null);
  };

  const confirmDuplicate = () => {
    if (!duplicate) return;
    if (blockedByUploads()) {
      setDuplicate(null);
      return;
    }

    const source = getValues(`titles.${duplicate.index}`) as RequestTitleDtoType | undefined;
    if (!source) return;

    const copies = clampCopies(duplicate.copies);

    // structuredClone per copy, not a shared spread: a shallow copy would hand every duplicate the
    // same titleAddress/dopaAddress object, so editing one row's address could reach the others.
    // They go in right after the title they came from, so a copy sits beside its original.
    setFilter(NO_FILTER);
    insert(
      duplicate.index + 1,
      Array.from({ length: copies }, () => ({
        ...structuredClone(source),
        // A copy is a new title with none of the original's saved identity or attached files.
        id: undefined,
        documents: [],
      })),
    );

    // A single copy is almost always about to be edited, so open it. A batch is not — the user
    // wants to see the list they just created.
    if (copies === 1) beginEdit(duplicate.index + 1, false);

    setDuplicate(null);
  };

  const confirmMove = () => {
    if (!moveDialog) return;
    // The place is within the title's own table; it is mapped to that place's slot in the array.
    const all = getValues('titles') as RequestTitleDtoType[];
    moveTitle(moveDialog.index, slotInGroup(all, moveDialog.index, moveDialog.position ?? 1));
    setMoveDialog(null);
  };

  /**
   * Drops the rows the user accepted in the import dialog into the field array.
   *
   * The server already validated them against the same rules the form uses, but they are re-parsed
   * here anyway: if one ever fails, the two rule sets have drifted, and losing that quietly would
   * mean the user only finds out when Save returns a 400.
   */
  const handleImportedRows = (rows: TitleImportRow[]) => {
    const accepted: RequestTitleDtoType[] = [];
    const rejected: string[] = [];

    rows.forEach(row => {
      // Address names are display-only and live outside the persisted DTO, so they are resolved
      // from the geocode the same way the picker does rather than being trusted from the response.
      const titleLookup = row.title.titleAddress?.subDistrict
        ? findAddressBySubDistrictCode(row.title.titleAddress.subDistrict, 'title')
        : undefined;
      const dopaLookup = row.title.dopaAddress?.subDistrict
        ? findAddressBySubDistrictCode(row.title.dopaAddress.subDistrict, 'dopa')
        : undefined;

      const candidate = {
        ...newTitle(''),
        ...row.title,
        titleAddress: {
          ...newTitle('').titleAddress,
          ...row.title.titleAddress,
          subDistrictName: titleLookup?.subDistrictName ?? row.subDistrictName ?? '',
          districtName: titleLookup?.districtName ?? row.districtName ?? '',
          provinceName: titleLookup?.provinceName ?? row.provinceName ?? '',
        },
        dopaAddress: {
          ...newTitle('').dopaAddress,
          ...row.title.dopaAddress,
          subDistrictName: dopaLookup?.subDistrictName ?? row.dopaSubDistrictName ?? '',
          districtName: dopaLookup?.districtName ?? row.dopaDistrictName ?? '',
          provinceName: dopaLookup?.provinceName ?? row.dopaProvinceName ?? '',
        },
        documents: [],
      } as RequestTitleDtoType;

      // Keep the PARSED value, not the candidate: zod carries the coercions the form's own inputs
      // rely on, and appending the raw object would skip them.
      const parsed = RequestTitleDto.safeParse(candidate);
      if (parsed.success) {
        accepted.push(parsed.data as RequestTitleDtoType);
      } else {
        rejected.push(`${row.sheet} #${row.rowNumber}`);
      }
    });

    if (accepted.length > 0) {
      setFilter(NO_FILTER);
      // One append with the whole batch: appending in a loop re-renders the list once per row.
      append(accepted);
    }

    if (rejected.length > 0) {
      // Name them. A bare count tells the user something went wrong in a 400-row import and gives
      // them no way to find it, and they would save the request believing the file went in whole.
      const shownRows = rejected.slice(0, 5).join(', ');
      toast.error(
        t('titleImport.rejectedOnAppend', {
          count: rejected.length,
          rows: rejected.length > 5 ? `${shownRows}, …` : shownRows,
        }),
        { duration: 10_000 },
      );
    }
    if (accepted.length > 0) {
      toast.success(t('titleImport.imported', { count: accepted.length }));
    }
  };

  const actions = useMemo<RowActions>(
    () => ({
      open: openTitle,
      duplicate: index =>
        !listIsStale() && !blockedByUploads() && setDuplicate({ index, copies: 1 }),
      remove: index => !listIsStale() && !blockedByUploads() && setDeleteConfirm(index),
      moveTo: index =>
        !listIsStale() &&
        !blockedByUploads() &&
        setMoveDialog({
          index,
          position: rankInGroup(getValues('titles') as RequestTitleDtoType[], index),
        }),
      moveToEdge,
    }),
    [openTitle, moveToEdge, blockedByUploads, listIsStale, getValues],
  );

  // An open title that is no longer in the array (deleted under the editor) ends the session.
  useEffect(() => {
    if (session && session.index >= fields.length) setSession(null);
  }, [session, fields.length]);
  const canOrder = !isReadOnly;
  const incompleteSubtitle =
    incompleteCount > 0
      ? ` · ${t('titleSection.incompleteCount', { count: incompleteCount })}`
      : '';

  return (
    <>
      <>
        {/* Initialize required documents for all titles */}
        {snapshot.map((_, index) => (
          <TitleRequiredDocsInitializer key={`init-${index}`} index={index} />
        ))}

        <FormCard
          // Scroll target for the array-level "must have at least 1 item" error: with no titles
          // added there are no per-field anchors inside to aim at.
          data-field="titles"
          title={t('forms.titleInformation')}
          subtitle={`${t('forms.titleCount', { count: titles.length })}${incompleteSubtitle}`}
          icon="file-certificate"
          iconColor="purple"
          required={true}
          noPadding
          // Square at the bottom: the tables run to the card's edge.
          className="rounded-b-none!"
          rightIcon={
            !isReadOnly ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {titles.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={estateSorted}
                    onClick={sortByNumber}
                    leftIcon={<Icon style="solid" name="arrow-down-1-9" className="size-3.5" />}
                  >
                    {t('titleSection.sort.button')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  // A plain text button like the sort one beside it: no icon, no fill at rest, a soft hover.
                  className="bg-transparent!"
                  onClick={() => setImportOpen(true)}
                >
                  {t('titleImport.button')}
                </Button>
                <TitleAddMenu onAdd={addTitle} allowed={allowed} />
              </div>
            ) : null
          }
        >
          <PriorAppraisalSummary />
          {titles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-(--palette-surface-3)">
                <Icon
                  style="regular"
                  name="file-lines"
                  className="text-2xl text-(--palette-gray-400)"
                />
              </div>
              <h3 className="m-0 text-base font-semibold text-(--palette-ink)">
                {t('empty.noTitles')}
              </h3>
              <p className="m-0 text-sm text-(--palette-gray-500)">
                {isReadOnly ? t('empty.noTitlesReadOnly') : t('titleSection.empty.hint')}
              </p>
              {!isReadOnly && <TitleAddMenu onAdd={addTitle} allowed={allowed} anchor="bottom" />}
            </div>
          ) : (
            // The last table's own bottom border is the card's edge.
            <TitleTableGroup
              hasEstate={groups.estate.length > 0}
              className="[&>section:last-of-type>div:last-child]:border-b-0"
            >
              {collapsed => (
                <>
                  {showToolbar && (
                    <TitleToolbar
                      filter={filter}
                      onChange={setFilter}
                      chips={chips}
                      shown={shown}
                      total={listTitles.length}
                      dragHint={filterActive && canOrder && listTitles.length > 1}
                    />
                  )}
                  {groups.estate.length > 0 && (
                    <TitleTable
                      kind="estate"
                      collapsed={collapsed}
                      heading={t('titleSection.group.estate')}
                      rows={estateRows}
                      groupRows={estateGroup}
                      titles={listTitles}
                      sigs={sigs}
                      missing={missing}
                      readOnly={isReadOnly}
                      canOrder={canOrder && groups.estate.length > 1}
                      dragOff={filterActive}
                      orderLocked={orderLocked}
                      actions={actions}
                      onReorder={moveTitle}
                      totals={estateTotal}
                    />
                  )}
                  {groups.movable.length > 0 && (
                    <TitleTable
                      kind="movable"
                      collapsed={collapsed}
                      heading={t('titleSection.group.movable')}
                      rows={movableRows}
                      groupRows={movableGroup}
                      titles={listTitles}
                      sigs={sigs}
                      missing={missing}
                      readOnly={isReadOnly}
                      canOrder={canOrder && groups.movable.length > 1}
                      dragOff={filterActive}
                      orderLocked={orderLocked}
                      actions={actions}
                      onReorder={moveTitle}
                    />
                  )}
                  {shown === 0 && (
                    <p className="m-0 px-5 py-8 text-center text-sm text-(--palette-gray-500)">
                      {t('titleSection.filter.none')}
                    </p>
                  )}
                </>
              )}
            </TitleTableGroup>
          )}

          {session && session.index < fields.length && (
            <TitleDrawer
              index={session.index}
              position={rankInGroup(typesNow, session.index)}
              total={groupSize(typesNow, session.index)}
              readOnly={isReadOnly}
              onPrev={navPos > 0 ? () => goTo(navOrder[navPos - 1]) : undefined}
              onNext={
                navPos >= 0 && navPos < navOrder.length - 1
                  ? () => goTo(navOrder[navPos + 1])
                  : undefined
              }
              onClose={cancelEditor}
              onSave={saveEditor}
              onCancel={cancelEditor}
              onSaveAndAdd={saveAndAddNext}
              acknowledgedPriors={acknowledgedPriors}
              documents={documentUpload}
            />
          )}

          <ConfirmDialog
            isOpen={discardNew !== null}
            onClose={() => setDiscardNew(null)}
            onConfirm={confirmDiscardNew}
            title={t('titleSection.discard.title')}
            message={t('titleSection.discard.message', { n: discardNew?.files ?? 0 })}
            confirmText={t('titleSection.discard.confirm')}
            cancelText={t('common:actions.cancel')}
            variant="danger"
          />

          <TitleImportDialog
            isOpen={isImportOpen}
            onClose={() => setImportOpen(false)}
            onConfirm={handleImportedRows}
          />

          <ConfirmDialog
            isOpen={duplicate !== null}
            onClose={() => setDuplicate(null)}
            onConfirm={confirmDuplicate}
            title={t('titleOptions.duplicateTitle')}
            confirmText={t('titleOptions.duplicateConfirm', {
              count: clampCopies(duplicate?.copies),
            })}
            cancelText={t('common:actions.cancel')}
            variant="primary"
          >
            <div className="flex flex-col gap-3">
              <p className="text-sm text-(--palette-gray-600)">
                {t('titleOptions.duplicateMessage', {
                  type:
                    duplicate === null
                      ? ''
                      : nameOfType(titles[duplicate.index]?.collateralType ?? '') ||
                        t('empty.noCollateralType'),
                  n: (duplicate?.index ?? 0) + 1,
                })}
              </p>
              <NumberInput
                label={t('titleOptions.duplicateCount')}
                value={duplicate?.copies ?? null}
                onChange={e =>
                  setDuplicate(prev => (prev ? { ...prev, copies: e.target.value } : prev))
                }
                decimalPlaces={0}
                thousandSeparator={false}
                min={1}
                max={MAX_DUPLICATE_COPIES}
              />
              <p className="text-xs text-(--palette-gray-400)">
                {t('titleOptions.duplicateHint', { max: MAX_DUPLICATE_COPIES })}
              </p>
            </div>
          </ConfirmDialog>

          <ConfirmDialog
            isOpen={moveDialog !== null}
            onClose={() => setMoveDialog(null)}
            onConfirm={confirmMove}
            title={t('titleSection.move.title')}
            confirmText={t('titleSection.move.confirm')}
            cancelText={t('common:actions.cancel')}
            variant="primary"
          >
            <div className="flex flex-col gap-3">
              <p className="text-sm text-(--palette-gray-600)">
                {t('titleSection.move.message', {
                  n: moveDialog ? rankInGroup(titles, moveDialog.index) : 0,
                  total: moveDialog ? groupSize(titles, moveDialog.index) : 0,
                })}
              </p>
              <NumberInput
                label={t('titleSection.move.position')}
                value={moveDialog?.position ?? null}
                onChange={e =>
                  setMoveDialog(prev => (prev ? { ...prev, position: e.target.value } : prev))
                }
                decimalPlaces={0}
                thousandSeparator={false}
                min={1}
                max={moveDialog ? groupSize(titles, moveDialog.index) : 1}
              />
            </div>
          </ConfirmDialog>

          <ConfirmDialog
            isOpen={deleteConfirm !== null}
            onClose={() => setDeleteConfirm(null)}
            onConfirm={confirmDelete}
            title={t('confirm.deleteTitleTitle')}
            message={t('confirm.deleteTitleMessage')}
            confirmText={t('common:actions.delete')}
            cancelText={t('common:actions.cancel')}
            variant="danger"
          />
        </FormCard>
      </>
    </>
  );
});

// Component to initialize required documents for a title (renders nothing). Memoised so a parent
// render does not re-run its watchers and query for every title; it follows its own title through
// the hooks inside.
const TitleRequiredDocsInitializer = memo(function TitleRequiredDocsInitializer({
  index,
}: {
  index: number;
}) {
  useTitleLevelRequiredDocuments(index);
  return null;
});

export default TitleInformationForm;
