import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { FormProvider, FormFields, type FormField } from '@shared/components/form';
import Icon from '@/shared/components/Icon';
import Section from '@/shared/components/sections/Section';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { useGetPropertyDetail } from '@/features/appraisal/api/propertyGroup';
import { useGetAppraisalById } from '@/features/appraisal/api/appraisal';
import { useGetRequestById } from '@features/request/api/requests';
import { useGetAppraisalDocuments } from '@/features/appraisal/api/appraisalDocuments';
import { getPropertyIcon } from '@/features/appraisal/utils/propertyTypeConfig';
import { EditorIdentityCard } from '@/features/appraisal/components/EditorIdentityCard';
import { PropertyTypeChip } from '@/features/appraisal/components/PropertyTypeChip';
import { usePropertyTypeLabels } from '@/shared/hooks/useCodeLabels';
import DataErrorState from '@/shared/components/DataErrorState';
import { useBreadcrumbExtrasStore } from '@shared/store';
import type {
  GetPropertyGroupByIdResponseType,
  PropertyCorrectionDtoType,
  PropertyGroupItemDtoType,
} from '@shared/schemas/v1';
import {
  useGetAppraisalPropertiesWithType,
  useGetCorrectionContext,
  useGetPropertyCorrections,
  useCorrectPropertyData,
} from '../api/appraisalDataCorrection';
import { getPropertyTypeForm } from '../configs/propertyTypeForms';
import { zodResolver } from '@hookform/resolvers/zod';
import { diffFormValues, type DiffEntry } from '../utils/formDiff';
import { withStoredBuildingValues } from '@/features/appraisal/utils/buildingStoredValues';
import CorrectionConfirmDialog from '../components/CorrectionConfirmDialog';
import CorrectionHistoryPanel, { HistoryFilterChips } from '../components/CorrectionHistoryPanel';
import CorrectionPageHeader from '../components/CorrectionPageHeader';
import DocumentCorrectionPane from '../components/DocumentCorrectionPane';
import LatestCorrectionCard from '../components/LatestCorrectionCard';
import { useRegenerationPoll } from '../hooks/useRegenerationPoll';
import { readApiError } from '../utils/readApiError';
import {
  countByTarget,
  DOCUMENTS_PANE,
  latestOf,
  type HistoryFilter,
} from '../utils/correctionHistory';
import type { Regeneration } from '../utils/documentCorrection';

// =============================================================================
// Left rail — properties in this appraisal
// =============================================================================

/** One clickable rail row. Unsaved changes (a dot) win over the edit-count badge. */
function RailItem({
  icon,
  label,
  sublabel,
  isSelected,
  editCount = 0,
  isDirty = false,
  onSelect,
}: {
  icon: { style: string; name: string };
  label: string;
  sublabel?: string;
  isSelected: boolean;
  editCount?: number;
  isDirty?: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation('appraisalDataCorrection');

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'grid w-full grid-cols-[2.1538rem_minmax(0,1fr)_auto] items-center gap-[0.6154rem] px-[0.9231rem] py-[0.4615rem] text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
        isSelected
          ? 'bg-[color:var(--dc-accent-wash)] shadow-[inset_3px_0_0_var(--dc-accent)]'
          : 'hover:bg-[color:var(--dc-surface-2)]',
      )}
    >
      <span
        className={clsx(
          'flex size-[2.1538rem] shrink-0 items-center justify-center rounded-[0.4615rem]',
          isSelected
            ? 'bg-[color:var(--dc-surface)] text-[color:var(--dc-accent-ink)]'
            : 'bg-[color:var(--dc-surface-3)] text-[color:var(--dc-ink-2)]',
        )}
      >
        <Icon style={icon.style} name={icon.name} className="size-[0.9231rem]" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[0.9231rem] font-medium text-[color:var(--dc-ink)]">
          {label}
        </div>
        {sublabel && (
          <div className="truncate text-[0.8077rem] text-[color:var(--dc-ink-3)]">{sublabel}</div>
        )}
      </div>
      {isDirty ? (
        <span
          role="img"
          aria-label={t('rail.unsaved')}
          title={t('rail.unsaved')}
          className="size-2 shrink-0 rounded-full bg-amber-500"
        />
      ) : editCount > 0 ? (
        <span className="shrink-0 rounded-full bg-[color:var(--dc-warn-wash)] px-[0.6154rem] py-[0.0769rem] text-[0.8462rem] font-medium text-[color:var(--dc-warn)]">
          {t('rail.edits', { count: editCount })}
        </span>
      ) : (
        <span />
      )}
    </button>
  );
}

function SectionLabel({ children, aside }: { children: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between px-[0.9231rem] pb-[0.2308rem] pt-[0.6154rem] text-[0.8077rem] font-semibold tracking-[0.04em] text-[color:var(--dc-ink-3)]">
      <span>{children}</span>
      {aside && <span className="font-normal normal-case tracking-normal">{aside}</span>}
    </div>
  );
}

function PropertyRail({
  propertyGroups,
  isLoading,
  isError,
  onRetry,
  selectedPropertyId,
  editCounts,
  dirtyPropertyId,
  onSelect,
}: {
  propertyGroups: GetPropertyGroupByIdResponseType[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedPropertyId: string | null;
  editCounts: ReadonlyMap<string, number>;
  /** The property whose form holds unsaved changes, if any. */
  dirtyPropertyId: string | null;
  onSelect: (propertyId: string) => void;
}) {
  const { t } = useTranslation('appraisalDataCorrection');
  // Only rows with an id are rendered, so only those are counted.
  const propertyCount = propertyGroups.reduce(
    (sum, g) => sum + g.properties.filter(p => p.propertyId).length,
    0,
  );

  // Properties often have no name of their own; fall back to the type's description rather
  // than its raw code ("LB"), which means nothing to the person reading the list.
  const typeLabel = usePropertyTypeLabels();

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="size-5 text-primary animate-spin" />
      </div>
    );
  } else if (isError) {
    body = (
      <DataErrorState variant="inline" title={t('detail.propertiesLoadFailed')} onRetry={onRetry} />
    );
  } else if (propertyCount === 0) {
    body = <p className="text-sm text-gray-500 px-2 py-2">{t('detail.noProperties')}</p>;
  } else {
    body = propertyGroups
      .filter(g => g.properties.length > 0)
      .map(g => (
        <div key={g.id} className="space-y-px">
          <div className="flex items-center gap-2 px-[0.9231rem] pb-[0.1538rem] pt-[0.3077rem] text-[0.8462rem] text-[color:var(--dc-ink-3)] after:flex-1 after:border-t after:border-[color:var(--dc-line-soft)]">
            <span className="truncate">
              {[t('rail.group', { number: g.groupNumber }), g.groupName]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          {g.properties.map(p => {
            const propertyId = p.propertyId;
            if (!propertyId) return null;
            return (
              <RailItem
                key={propertyId}
                icon={getPropertyIcon(p.propertyType ?? '')}
                label={p.propertyName || t('detail.unnamedProperty')}
                sublabel={typeLabel(p.propertyType) || undefined}
                isSelected={propertyId === selectedPropertyId}
                editCount={editCounts.get(propertyId)}
                isDirty={propertyId === dirtyPropertyId}
                onSelect={() => onSelect(propertyId)}
              />
            );
          })}
        </div>
      ));
  }

  return (
    <div>
      {/* No count until loaded: "(0)" beside the spinner or the error would read as an empty
          (or partial) appraisal. */}
      <SectionLabel
        aside={isLoading || isError ? undefined : t('rail.propertyCount', { count: propertyCount })}
      >
        {t('rail.properties')}
      </SectionLabel>
      {body}
    </div>
  );
}

/** The valuation-documents entry, set apart below the property list. */
function DocumentsRailEntry({
  appraisalId,
  isSelected,
  editCount,
  onSelect,
}: {
  appraisalId: string | undefined;
  isSelected: boolean;
  editCount: number | undefined;
  onSelect: () => void;
}) {
  const { t } = useTranslation('appraisalDataCorrection');
  // Same query the documents pane reads, so this costs nothing extra once the pane is open.
  const { data } = useGetAppraisalDocuments(appraisalId);
  // Undefined until the list loads, so a pending or failed fetch does not read as "0 files".
  const fileCount = data?.types.reduce((sum, ty) => sum + ty.totalFiles, 0);
  const fileLabel =
    fileCount === undefined ? undefined : t('documents.fileCount', { count: fileCount });

  return (
    <div>
      <SectionLabel>{t('rail.documents')}</SectionLabel>
      <RailItem
        icon={{ style: 'solid', name: 'file-lines' }}
        label={t('documents.title')}
        sublabel={fileLabel}
        isSelected={isSelected}
        editCount={editCount}
        onSelect={onSelect}
      />
    </div>
  );
}

// =============================================================================
// Property correction editor — one mounted instance per property
// =============================================================================

/**
 * Whether a dirtyFields node holds a real edit. After a field-array operation RHF leaves the
 * array's entry behind as a tree of `false` leaves even when the rows equal the record, so a key
 * being present is not enough.
 */
const hasEdit = (node: unknown): boolean =>
  node === true || (typeof node === 'object' && node !== null && Object.values(node).some(hasEdit));

function PropertyCorrectionEditor({
  appraisalId,
  property,
  editCount,
  latestEdit,
  onOpenHistory,
  onDirtyChange,
  onSelectProperty,
}: {
  appraisalId: string;
  property: PropertyGroupItemDtoType;
  /** Undefined until the history has loaded. */
  editCount: number | undefined;
  latestEdit: PropertyCorrectionDtoType | undefined;
  onOpenHistory: () => void;
  /** Reports whether the form holds unsaved changes, for the rail's marker. */
  onDirtyChange: (isDirty: boolean) => void;
  /** Another property was picked from inside the form (the construction tab's building list). */
  onSelectProperty: (propertyId: string) => void;
}) {
  const { t } = useTranslation('appraisalDataCorrection');
  // The identity block above the tab bar: what picking a tab scrolls back up to.
  const headRef = useRef<HTMLDivElement>(null);
  const propertyId = property.propertyId!;
  const typeCode = property.propertyType ?? '';
  const [pendingSubmit, setPendingSubmit] = useState<{
    reason: string;
    /** The body the property's real PUT takes, complete: the update overwrites the record. */
    payload: unknown;
    diff: DiffEntry[];
  } | null>(null);

  const config = getPropertyTypeForm(typeCode);
  // Always refetch on open: the save overwrites the whole record, so seeding it from a cached copy
  // would silently revert anything another admin corrected in the meantime.
  const {
    data: raw,
    isLoading,
    isError,
    dataUpdatedAt,
    refetch,
  } = useGetPropertyDetail(appraisalId, propertyId, typeCode, { refetchOnMount: 'always' });
  // Not isFetchedAfterMount: a failed refetch sets that too, leaving `raw` the cached copy.
  const [mountedAt] = useState(() => Date.now());
  const isFresh = dataUpdatedAt >= mountedAt;
  // The construction inspection locks its method switch on a progressive round.
  const { data: appraisal } = useGetAppraisalById(appraisalId);
  const ciMode = appraisal?.appraisalType === 'Progressive';

  // Seed the property page's own form shape from the record, exactly as that page does.
  // `reason` rides along as an extra key (excluded from the dirty check below).
  const defaults = useMemo(() => {
    if (!config || !raw || !isFresh) return undefined;
    return { ...config.toForm(raw), reason: '' };
  }, [config, raw, isFresh]);

  const methods = useForm<Record<string, unknown>>({
    defaultValues: defaults ?? { reason: '' },
    // The property page's own schema, enforced in full: every field marked required has to hold
    // a value before the correction saves, whether or not this admin was the one who emptied it.
    //
    // The cost is real and deliberate. A record completed before a field became mandatory will
    // block on that field, so an admin who came to fix a title number may have to supply
    // something unrelated first. Chosen anyway: the labels carry a red asterisk from this same
    // config, and a screen that shows the rule but does not apply it is the worse failure — it
    // lets a correction save a required field empty and calls that success.
    // The registry stores schemas as `z.ZodTypeAny`, wide enough to hold every property type but
    // without the concrete `_def` zodResolver's overloads match on. The property pages pass their
    // schema object directly and never hit this; here the cast is what lets one registry serve
    // them all.
    resolver: config
      ? (zodResolver(config.schema as never) as Resolver<Record<string, unknown>>)
      : undefined,
  });
  const {
    handleSubmit,
    reset,
    getValues,
    formState: { dirtyFields },
  } = methods;

  // What the form is compared against, for Discard and the confirm dialog: the record as loaded,
  // or as just saved. Not `defaults` itself — after a save the form is reset to what was saved
  // while `defaults` still holds the old record until the refetch lands.
  const baseline = useRef<Record<string, unknown> | undefined>(defaults);
  // dirtyFields, not isDirty: read during render, the proxy keeps it current. `reason` is not an edit.
  const hasDirtyFields = Object.entries(dirtyFields).some(([k, v]) => k !== 'reason' && hasEdit(v));
  useEffect(() => {
    if (!defaults) return;
    // A refetch (e.g. the one a save triggers) must not throw away field edits typed since then.
    // The first seed always applies. A reason typed meanwhile is carried over, not a reason to skip:
    // skipping would keep the values as sent instead of what the server stored.
    if (baseline.current && hasDirtyFields) return;
    baseline.current = defaults;
    reset({ ...defaults, reason: getValues('reason') ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  useEffect(() => {
    onDirtyChange(hasDirtyFields);
    // Unmounting (another entry selected, or the page left) clears the marker with it.
    return () => onDirtyChange(false);
  }, [hasDirtyFields, onDirtyChange]);
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);
  const { mutate: correctProperty, isPending } = useCorrectPropertyData();

  // Unsupported type first: `defaults` is undefined without a config, so checking the spinner
  // condition first would leave such a property spinning forever instead of saying why.
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Icon style="solid" name="triangle-exclamation" className="size-8 text-amber-500" />
        <p className="text-gray-600">{t('detail.unsupportedType', { type: typeCode })}</p>
      </div>
    );
  }

  // Only before the first seed: a later failed refetch keeps the form (and its unsaved edits).
  if (isError && !defaults) return <DataErrorState onRetry={() => refetch()} />;

  if (isLoading || !defaults) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // The resolver only gates the save; nothing reads its output. It runs the property's own
  // schema, and a zod object drops every key it does not declare (`reason` among them). The update
  // is a full overwrite, so a dropped key is wiped. Everything is therefore read from the form, as
  // the property page's draft save does.
  const onSubmit = () => {
    const reason = String(getValues('reason') ?? '').trim();
    if (!reason) {
      methods.setError('reason', { type: 'required', message: t('detail.reasonRequired') });
      return;
    }

    // A payload with nothing different from the record is not worth a round trip — the server
    // refuses it too (NO_CHANGES).
    const formValues = getValues();
    // Compared as the server will store them: a Building Cost Value or insurance left to the table is
    // saved as the figure the table gives, not as blank, so the confirm dialog and the audit show it.
    const diff = diffFormValues(
      withStoredBuildingValues(baseline.current ?? defaults),
      withStoredBuildingValues(formValues),
    );
    if (diff.length === 0) {
      toast.error(t('detail.noChanges'));
      return;
    }

    const propertyValues = { ...formValues };
    delete propertyValues.reason;
    setPendingSubmit({ reason, payload: config.toPayload(propertyValues), diff });
  };

  const reasonField: FormField = {
    type: 'textarea',
    label: t('confirmDialog.reasonLabel'),
    name: 'reason',
    required: true,
    maxLength: 4000,
    showCharCount: true,
    wrapperClassName: 'col-span-12',
  };

  const handleConfirm = () => {
    if (!pendingSubmit) return;
    correctProperty(
      {
        appraisalId,
        propertyId,
        suffix: config.suffix,
        reason: pendingSubmit.reason,
        data: pendingSubmit.payload,
      },
      {
        onSuccess: () => {
          toast.success(t('detail.saveSuccess'));
          setPendingSubmit(null);
          skipWarning();
          // The reason belongs to the correction just saved, not to the next one.
          const saved = { ...getValues(), reason: '' };
          baseline.current = saved;
          reset(saved);
        },
        onError: error => {
          // 409: the appraisal was reopened out from under the admin mid-edit. 400 NO_CHANGES:
          // the record already holds these values (the preview compares the form, not the record).
          const { errorCode, detail } = readApiError(error);
          if (errorCode === 'APPRAISAL_NOT_COMPLETED') {
            toast.error(t('detail.appraisalNotCompleted'));
          } else if (errorCode === 'NO_CHANGES') {
            toast.error(t('detail.noChangesSaved'));
          } else {
            toast.error(detail || t('detail.saveFailed'));
          }
          setPendingSubmit(null);
        },
      },
    );
  };

  return (
    <FormProvider methods={methods} schema={config.schema}>
      {/* `cas-form-grid` on the form and `form-scroll-container` on its scroller, exactly as the
          property pages have them: the shared form styles (the sheet look, the pinned section
          headers under the tab bar) are keyed on both. */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="cas-form-grid cas-dc-editor flex-1 min-h-0 flex flex-col"
      >
        <div
          id="form-scroll-container"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
        >
          {/* The property page's own identity card, so the pane opens the way that page does. It
              sits flush with the pane's top and sides (`.cas-dc-editor` in formLayoutSkin.css): no
              gutter on the scroller, so the sticky tab bar below reaches the pane's top edge once
              this has scrolled away. */}
          <div ref={headRef} className="cas-dc-head">
            <EditorIdentityCard
              top={<PropertyTypeChip code={typeCode} className="cas-id-badge" />}
              title={property.propertyName || t('detail.unnamedProperty')}
              titleMuted={!property.propertyName}
            >
              {editCount !== undefined && (
                <p className="cas-id-facts text-[13px] text-gray-600">
                  {editCount > 0 ? t('edits.count', { count: editCount }) : t('edits.none')}
                </p>
              )}
            </EditorIdentityCard>

            {latestEdit && (
              <LatestCorrectionCard correction={latestEdit} onViewAll={onOpenHistory} />
            )}
          </div>

          {/* The property page's own tab bar and panels. Its bar is a direct child of the scroll
              container (it is `sticky`), so the body is rendered here and not inside a wrapper. */}
          {config.render({ propertyId, ciMode, onSelectProperty, scrollAnchorRef: headRef })}

          {/* Dressed as one more section of the form rather than a card bolted underneath:
              same `cas-section-head` band as every block above, so the reason reads as the last
              thing you fill in, not a separate dialog. Below the panels, so it is there on
              whichever tab is open. */}
          <Section>
            <div className="cas-section-grid cas-sheet">
              <div className="cas-section-head mb-2 flex items-center gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                  <Icon style="solid" name="comment" className="size-3.5 text-primary-600" />
                </div>
                <span className="text-sm font-medium leading-tight text-gray-700">
                  {t('detail.reasonTitle')}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <FormFields fields={[reasonField]} />
              </div>
            </div>
          </Section>
        </div>

        <ActionBar>
          {/* Discard on the far left, Save on the far right, as the property pages have them:
              Discard throws away every edit, so it does not sit beside the button it undoes. */}
          <ActionBar.Left>
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset(baseline.current ?? defaults)}
              disabled={!hasDirtyFields || isPending}
            >
              {t('detail.discard')}
            </Button>
          </ActionBar.Left>
          <ActionBar.Right>
            <Button type="submit" disabled={!hasDirtyFields || isPending}>
              {t('detail.submit')}
            </Button>
          </ActionBar.Right>
        </ActionBar>
      </form>

      <CorrectionConfirmDialog
        isOpen={pendingSubmit !== null}
        onClose={() => setPendingSubmit(null)}
        onConfirm={handleConfirm}
        diff={pendingSubmit?.diff ?? []}
        reason={pendingSubmit?.reason ?? ''}
        isLoading={isPending}
      />

      <UnsavedChangesDialog blocker={blocker} />
    </FormProvider>
  );
}

const AppraisalDataCorrectionDetailPage = () => {
  const { t } = useTranslation('appraisalDataCorrection');
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    properties,
    propertyGroups,
    isLoading,
    isError: propertiesFailed,
    refetch: refetchProperties,
  } = useGetAppraisalPropertiesWithType(appraisalId);
  const { data: appraisal } = useGetAppraisalById(appraisalId);
  // Customer lives on the request, same source as the 360 page header.
  const { data: request } = useGetRequestById(appraisal?.requestId);

  // Show which appraisal is open as a third crumb. Only once the number has actually
  // loaded — deliberately NOT falling back to appraisalId, which would flash the raw
  // UUID in the breadcrumb on refresh.
  const setBreadcrumbExtras = useBreadcrumbExtrasStore(s => s.setExtras);
  const appraisalNumber = appraisal?.appraisalNumber;
  useEffect(() => {
    if (!appraisalNumber || !appraisalId) return;
    setBreadcrumbExtras([
      { label: appraisalNumber, href: `/standalone/appraisal-data-correction/${appraisalId}` },
    ]);
    return () => setBreadcrumbExtras([]);
  }, [appraisalNumber, appraisalId, setBreadcrumbExtras]);

  // The selection lives in the URL so switching entries is a navigation: the editor's
  // UnsavedChangesDialog then asks before a dirty form is thrown away, which local state could not.
  // The fallback waits for every group: group details resolve in any order, so a partial list
  // would open one property and then swap it for another's editor as the earlier group arrives.
  const selectedPropertyId =
    searchParams.get('propertyId') ??
    (isLoading || propertiesFailed
      ? null
      : (properties.find(p => p.propertyId)?.propertyId ??
        // A block appraisal has no properties at all; its documents are the only thing to correct.
        DOCUMENTS_PANE));
  // Re-selecting the open entry is not a navigation — it would raise the unsaved-changes prompt for nothing.
  const setSelectedPropertyId = (id: string) => {
    if (id !== selectedPropertyId) setSearchParams({ propertyId: id }, { replace: true });
  };

  // Held here, not in the pane, so leaving the documents entry mid-regeneration does not re-enable
  // the button — a second click would queue another job and notify the source system again.
  const [regeneration, setRegeneration] = useState<Regeneration | null>(null);
  // Tied to one appraisal: a route change to another must not inherit its disabled button or baseline.
  useEffect(() => setRegeneration(null), [appraisalId]);
  useRegenerationPoll(appraisalId, regeneration, setRegeneration);

  const selectedProperty = properties.find(p => p.propertyId === selectedPropertyId);

  // One history query feeds the header, the rail badges, the property card and the drawer.
  const { data: history } = useGetPropertyCorrections(appraisalId);
  const corrections = history?.corrections;
  const editCounts = useMemo(() => countByTarget(corrections ?? []), [corrections]);
  const latestEdit = useMemo(() => latestOf(corrections ?? []), [corrections]);
  const { data: source } = useGetCorrectionContext(appraisalId);

  // Only the open editor is mounted, so at most one property can be dirty.
  const [editorDirty, setEditorDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const openHistory = () => setHistoryOpen(true);
  // Close first: a dirty form makes the selection raise the unsaved-changes prompt, which the
  // open drawer would otherwise sit behind.
  const selectFromHistory = (id: string) => {
    setHistoryOpen(false);
    setSelectedPropertyId(id);
  };

  return (
    // The gutter is what lets the frame's shadow show: the app layout's content scroller clips at its
    // own edge, and the property pages have the same 0.75rem gutter around their frame.
    <div className="h-full min-h-0 px-3 pt-3 pb-6">
      <div className="flex flex-col h-full min-h-0 overflow-hidden rounded-[0.7692rem] border border-[color:var(--palette-line-strong)] bg-[color:var(--dc-surface)] [box-shadow:var(--palette-shadow-lift)]">
        <CorrectionPageHeader
          appraisalNumber={appraisal?.appraisalNumber}
          customerName={request?.customers?.[0]?.name}
          status={appraisal?.status}
          approvedAt={source?.completedAt}
          externalSystem={source?.externalSystem ?? null}
          editCount={corrections?.length}
          latestEditAt={latestEdit?.changedAt}
          onOpenHistory={openHistory}
        />

        <div className="flex-1 min-h-0 flex">
          <nav className="grid w-[17.8462rem] shrink-0 content-start gap-px overflow-y-auto border-r border-[color:var(--dc-line)] bg-[color:var(--dc-surface)] pb-[1.2308rem] pt-[0.3077rem]">
            <PropertyRail
              propertyGroups={propertyGroups}
              isLoading={isLoading}
              isError={propertiesFailed}
              onRetry={refetchProperties}
              selectedPropertyId={selectedPropertyId}
              editCounts={editCounts}
              dirtyPropertyId={editorDirty ? selectedPropertyId : null}
              onSelect={setSelectedPropertyId}
            />
            <DocumentsRailEntry
              appraisalId={appraisalId}
              isSelected={selectedPropertyId === DOCUMENTS_PANE}
              editCount={editCounts.get(DOCUMENTS_PANE)}
              onSelect={() => setSelectedPropertyId(DOCUMENTS_PANE)}
            />
          </nav>

          <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[color:var(--dc-surface)]">
            {selectedPropertyId === DOCUMENTS_PANE ? (
              <DocumentCorrectionPane
                // Per appraisal, like the editor: an open dialog (it holds a document type and file of the
                // appraisal it was opened on) must not carry over to another appraisal.
                key={appraisalId}
                appraisalId={appraisalId!}
                regeneration={regeneration}
                onRegenerationChange={setRegeneration}
              />
            ) : selectedProperty ? (
              <PropertyCorrectionEditor
                key={selectedProperty.propertyId}
                appraisalId={appraisalId!}
                property={selectedProperty}
                editCount={corrections && (editCounts.get(selectedProperty.propertyId!) ?? 0)}
                latestEdit={latestOf(corrections ?? [], selectedProperty.propertyId!)}
                onOpenHistory={openHistory}
                onDirtyChange={setEditorDirty}
                onSelectProperty={setSelectedPropertyId}
              />
            ) : (
              !isLoading && (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  {t('detail.selectProperty')}
                </div>
              )
            )}
          </div>
        </div>

        <SlideOverPanel
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title={t('history.title')}
          width="md"
          headerActions={<HistoryFilterChips value={historyFilter} onChange={setHistoryFilter} />}
        >
          <CorrectionHistoryPanel
            appraisalId={appraisalId!}
            properties={properties}
            onSelectTarget={selectFromHistory}
            filter={historyFilter}
          />
        </SlideOverPanel>
      </div>
    </div>
  );
};

export default AppraisalDataCorrectionDetailPage;
