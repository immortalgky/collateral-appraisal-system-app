import { useEffect, useMemo, useState } from 'react';
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
import Badge from '@/shared/components/Badge';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { useGetPropertyDetail } from '@/features/appraisal/api/propertyGroup';
import { useGetAppraisalById } from '@/features/appraisal/api/appraisal';
import { getTypeIconName } from '@/features/appraisal/utils/propertyTypeConfig';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useBreadcrumbExtrasStore } from '@shared/store';
import type { PropertyGroupItemDtoType } from '@shared/schemas/v1';
import {
  useGetAppraisalPropertiesWithType,
  useCorrectPropertyData,
} from '../api/appraisalDataCorrection';
import { getPropertyTypeForm } from '../configs/propertyTypeForms';
import {
  buildCorrectionRequest,
  hasRealChanges,
  type CorrectionRequestBody,
} from '../utils/toCorrectionRequest';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildDiffRows, type DiffRow } from '../utils/diffRows';
import CorrectionConfirmDialog from '../components/CorrectionConfirmDialog';
import CorrectionHistoryPanel from '../components/CorrectionHistoryPanel';

/**
 * React Query types the mutation's error as `Error`; axios hangs the response body off it. The
 * only thing worth branching on is the backend's stable `errorCode` — the `detail` string is
 * written for logs, so it's a last resort rather than the message users normally see.
 */
function readApiError(error: Error): { errorCode?: string; detail?: string } {
  const e = error as Error & {
    response?: { data?: { errorCode?: string } };
    apiError?: { detail?: string };
  };
  return { errorCode: e.response?.data?.errorCode, detail: e.apiError?.detail };
}

const reasonField: FormField = {
  type: 'textarea',
  label: 'Reason for correction',
  name: 'reason',
  required: true,
  maxLength: 4000,
  showCharCount: true,
  wrapperClassName: 'col-span-12',
};

// =============================================================================
// Left rail — properties in this appraisal
// =============================================================================

function PropertyRail({
  properties,
  isLoading,
  selectedPropertyId,
  onSelect,
}: {
  properties: PropertyGroupItemDtoType[];
  isLoading: boolean;
  selectedPropertyId: string | null;
  onSelect: (propertyId: string) => void;
}) {
  const { t } = useTranslation('appraisalDataCorrection');

  // Properties often have no name of their own; fall back to the type's description rather
  // than its raw code ("LB"), which means nothing to the person reading the list.
  const propertyTypeParams = useParametersByGroup('PropertyType');
  const typeLabel = useMemo(
    () => new Map(propertyTypeParams.map(p => [p.code, p.description])),
    [propertyTypeParams],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="size-5 text-primary animate-spin" />
      </div>
    );
  }

  if (properties.length === 0) {
    return <p className="text-sm text-gray-500 px-2 py-4">{t('detail.noProperties')}</p>;
  }

  return (
    <div className="space-y-1">
      {properties.map(p => {
        const isSelected = p.propertyId === selectedPropertyId;
        return (
          <button
            key={p.propertyId}
            type="button"
            onClick={() => p.propertyId && onSelect(p.propertyId)}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
              isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700',
            )}
          >
            <Icon
              style="solid"
              name={getTypeIconName(p.propertyType ?? '')}
              className={clsx('size-4 shrink-0', isSelected ? 'text-primary' : 'text-gray-400')}
            />
            <div className="min-w-0 flex-1">
              <div className={clsx('text-sm truncate', isSelected && 'font-medium')}>
                {p.propertyName || t('detail.unnamedProperty')}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {typeLabel.get(p.propertyType ?? '') || p.propertyType}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Property correction editor — one mounted instance per (propertyId, typeCode)
// =============================================================================

function PropertyCorrectionEditor({
  appraisalId,
  appraisalNumber,
  appraisalStatus,
  property,
  properties,
}: {
  appraisalId: string;
  appraisalNumber?: string | null;
  appraisalStatus?: string | null;
  property: PropertyGroupItemDtoType;
  /** All properties on this appraisal — the history panel labels its entries with them. */
  properties: PropertyGroupItemDtoType[];
}) {
  const { t } = useTranslation('appraisalDataCorrection');
  const propertyId = property.propertyId!;
  const typeCode = property.propertyType ?? '';
  const [showHistory, setShowHistory] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{
    reason: string;
    body: CorrectionRequestBody;
    diff: DiffRow[];
  } | null>(null);

  const propertyTypeParams = useParametersByGroup('PropertyType');
  const typeLabel = useMemo(
    () => new Map(propertyTypeParams.map(p => [p.code, p.description])),
    [propertyTypeParams],
  );

  const config = getPropertyTypeForm(typeCode);
  const { data: raw, isLoading } = useGetPropertyDetail(appraisalId, propertyId, typeCode);

  // Seed the create/edit screen's own form shape from the record, exactly as that screen
  // does. `reason` rides along as an extra key so it participates in dirty tracking.
  const defaults = useMemo(() => {
    if (!config || !raw) return undefined;
    return { ...config.defaults, ...config.toForm(raw), reason: '' } as Record<string, unknown>;
  }, [config, raw]);

  const methods = useForm<Record<string, unknown>>({
    defaultValues: defaults ?? { reason: '' },
    // The create screen's own schema, enforced in full: every field marked required has to hold
    // a value before the correction saves, whether or not this admin was the one who emptied it.
    //
    // The cost is real and deliberate. A record completed before a field became mandatory will
    // block on that field, so an admin who came to fix a title number may have to supply
    // something unrelated first. Chosen anyway: the labels carry a red asterisk from this same
    // config, and a screen that shows the rule but does not apply it is the worse failure — it
    // lets a correction save a required field empty and calls that success.
    // The registry stores schemas as `z.ZodType<Record<string, unknown>>`, which is wide enough
    // to hold all eleven property types but drops the concrete `_def` zodResolver's overloads
    // match on. The create screens pass their schema object directly and never hit this; here
    // the cast is what lets one registry serve them all.
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

  useEffect(() => {
    if (defaults) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  const hasDirtyFields = Object.keys(dirtyFields).some(k => k !== 'reason');
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

  if (isLoading || !defaults) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = (values: Record<string, unknown>) => {
    const reason = String(values.reason ?? '').trim();
    if (!reason) {
      methods.setError('reason', { type: 'required', message: t('detail.reasonRequired') });
      return;
    }

    const body = buildCorrectionRequest(typeCode, reason, dirtyFields, values, defaults);
    if (!hasRealChanges(body)) {
      toast.error(t('detail.noChanges'));
      return;
    }

    setPendingSubmit({ reason, body, diff: buildDiffRows(body, defaults, values) });
  };

  const handleConfirm = () => {
    if (!pendingSubmit) return;
    correctProperty(
      { appraisalId, propertyId, data: pendingSubmit.body },
      {
        onSuccess: () => {
          toast.success(t('detail.saveSuccess'));
          setPendingSubmit(null);
          skipWarning();
          reset(getValues());
        },
        onError: error => {
          // 409 means the appraisal was reopened out from under the admin mid-edit.
          const { errorCode, detail } = readApiError(error);
          if (errorCode === 'APPRAISAL_NOT_COMPLETED') {
            toast.error(t('detail.appraisalNotCompleted'));
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
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-1">
          {/* Context header — what's being edited, and against which record */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {property.propertyName || t('detail.unnamedProperty')}
                </h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {typeLabel.get(typeCode) || typeCode}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                {appraisalNumber && <span>{appraisalNumber}</span>}
                {appraisalNumber && appraisalStatus && <span aria-hidden="true">·</span>}
                {appraisalStatus && (
                  <Badge type="status" value={appraisalStatus} size="xs">
                    {appraisalStatus}
                  </Badge>
                )}
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowHistory(v => !v)}>
              <Icon style="solid" name="clock-rotate-left" className="size-3.5 mr-1.5" />
              {t('detail.historyToggle')}
            </Button>
          </div>

          {showHistory && (
            <Section className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <CorrectionHistoryPanel appraisalId={appraisalId} properties={properties} />
            </Section>
          )}

          {/* The create/edit screen's own form body, reused verbatim — same layout, section
              headings, labels, field order and dropdown sources the appraiser already knows.
              A flex column, exactly as those screens wrap it: the forms build their own grid
              inside, and an outer grid would fight the label rail they lay out against. */}
          <div className="cas-form-grid flex flex-col gap-8 min-w-0 max-w-full">
            {config.render()}
          </div>

          {/* Dressed as one more section of the form rather than a card bolted underneath:
              same `cas-form-grid` wrapper and `cas-section-head` band as every block above,
              so the reason reads as the last thing you fill in, not a separate dialog. */}
          <Section className="cas-form-grid mt-6 mb-6">
            <div className="cas-section-grid">
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
          {/* ActionBar spreads its children apart, so both actions go in the right-hand group
              to sit together. Discard is a ghost: it is the escape hatch, not a peer of Save,
              and a filled button beside a filled button asks the reader which one is the point. */}
          <ActionBar.Left>
            <span />
          </ActionBar.Left>
          <ActionBar.Right>
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset(defaults)}
              disabled={!hasDirtyFields || isPending}
            >
              {t('detail.discard')}
            </Button>
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
        diffRows={pendingSubmit?.diff ?? []}
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
  const [searchParams] = useSearchParams();
  const { properties, isLoading } = useGetAppraisalPropertiesWithType(appraisalId);
  const { data: appraisal } = useGetAppraisalById(appraisalId);

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

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    searchParams.get('propertyId'),
  );

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0 && properties[0].propertyId) {
      setSelectedPropertyId(properties[0].propertyId);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = properties.find(p => p.propertyId === selectedPropertyId);

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="flex-1 min-h-0 flex gap-4">
        <div className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 pr-3">
          <PropertyRail
            properties={properties}
            isLoading={isLoading}
            selectedPropertyId={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {selectedProperty ? (
            <PropertyCorrectionEditor
              key={selectedProperty.propertyId}
              appraisalId={appraisalId!}
              appraisalNumber={appraisal?.appraisalNumber}
              appraisalStatus={appraisal?.status}
              property={selectedProperty}
              properties={properties}
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
    </div>
  );
};

export default AppraisalDataCorrectionDetailPage;
