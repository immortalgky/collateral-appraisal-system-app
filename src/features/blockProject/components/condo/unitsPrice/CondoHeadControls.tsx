import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { errorText } from '@/shared/utils/errorUtils';

import { useDownloadUnitPriceTemplate } from '../../../api/projectUnitPrice';
import type { ProjectUnitPrice, UnitPriceSource, UnitPriceSourceInfo } from '../../../types';
import { WarningNote } from './look';

// The unit-price results head's price-source controls (the file keeps its old name; it now holds
// the switch and the Imported-mode pieces that replaced the source card and the import card).

interface CondoSourceSwitchProps {
  /** The source the page is showing (the local override over the server's). */
  current: UnitPriceSource;
  /** Read-only page: the other source is shown but cannot be chosen. */
  readOnly: boolean;
  /** A save or import is running: the switch is locked. */
  busy: boolean;
  onSwitch: (next: UnitPriceSource) => void;
}

// `as const`: the translation keys are typed, so they must stay literals.
const OPTIONS = [
  { source: 'Calculated', icon: 'calculator', labelKey: 'unitPrice.source.calculated' },
  // The shorter wording: the head is tight (LB keeps `unitPrice.source.imported`).
  { source: 'Imported', icon: 'file-excel', labelKey: 'condoUnitsPrice.dense.sourceImported' },
] as const satisfies readonly { source: UnitPriceSource; icon: string; labelKey: string }[];

/**
 * The two price sources as a compact segmented control. The one in use is pressed and does
 * nothing; the other goes through the page's own confirm flow (`onSwitch`).
 */
export function CondoSourceSwitch({ current, readOnly, busy, onSwitch }: CondoSourceSwitchProps) {
  const { t } = useTranslation('blockProject');

  // The shared segmented control (the one the LandAndBuilding source switch uses). Choosing the
  // option already in use does nothing: `onSwitch` ignores it.
  return (
    <SegmentedControl<UnitPriceSource>
      label={t('unitPrice.source.label')}
      value={current}
      onChange={onSwitch}
      options={OPTIONS.map(o => ({
        value: o.source,
        label: t(o.labelKey),
        icon: o.icon,
        disabled: o.source !== current && (readOnly || busy),
      }))}
    />
  );
}

interface CondoImportControlsProps {
  appraisalId: string;
  source: UnitPriceSourceInfo | undefined;
  isReadOnly: boolean;
  onUpload: () => void;
}

/** Imported mode, in the head: which file the prices came from, the template, the upload. */
export function CondoImportControls({
  appraisalId,
  source,
  isReadOnly,
  onUpload,
}: CondoImportControlsProps) {
  const { t, i18n } = useTranslation('blockProject');
  const download = useDownloadUnitPriceTemplate();

  const handleDownload = () =>
    download.mutate(
      { appraisalId },
      {
        onError: (err: unknown) =>
          toast.error(errorText(err, t('unitPrice.import.templateFailed'))),
      },
    );

  return (
    <>
      {/* Metadata only while the server's prices really are an import: a local switch to this
          view over calculated prices must not show an old file as current. */}
      {source?.source === 'Imported' && source.fileName && (
        <span
          className="flex min-w-0 items-center gap-1.5 text-xs text-(--palette-ink-2)"
          title={[
            source.fileName,
            source.importedBy,
            source.importedAt && formatLocaleDateTime(source.importedAt, i18n.language),
          ]
            .filter(Boolean)
            .join(' · ')}
        >
          <Icon name="file-excel" style="light" className="shrink-0" />
          <span className="max-w-[16rem] truncate">{source.fileName}</span>
          {source.importedAt && <span>· {formatLocaleDate(source.importedAt, i18n.language)}</span>}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        isLoading={download.isPending}
        title={t('unitPrice.import.downloadTemplateTitle')}
        aria-label={t('unitPrice.import.downloadTemplate')}
        leftIcon={<Icon name="download" style="light" />}
      >
        {t('condoUnitsPrice.dense.template')}
      </Button>
      {!isReadOnly && (
        <Button size="sm" onClick={onUpload} leftIcon={<Icon name="file-arrow-up" style="light" />}>
          {t('unitPrice.import.upload')}
        </Button>
      )}
    </>
  );
}

interface CondoImportNoticeProps {
  source: UnitPriceSourceInfo | undefined;
  /** Undefined until the unit prices have loaded (or when they failed to). */
  unitPrices: ProjectUnitPrice[] | undefined;
}

/** What the import card used to say under its head: nothing priced yet, or the file record is gone. */
export function CondoImportNotice({ source, unitPrices }: CondoImportNoticeProps) {
  const { t } = useTranslation('blockProject');
  const allEmpty =
    !!unitPrices &&
    unitPrices.length > 0 &&
    unitPrices.every(up => up.totalAppraisalValueRounded == null);

  if (allEmpty) {
    return <WarningNote className="mx-3.5 mt-2">{t('unitPrice.import.emptyPrices')}</WarningNote>;
  }
  // Imported, but the file's record is gone (the unit list was replaced): never "no price file
  // yet", which is what a project that was never imported says.
  if (source?.source === 'Imported' && !source.fileName) {
    return (
      <p className="px-4 pt-2 text-xs text-(--palette-ink-2)">
        {t('unitPrice.import.fileUnknown')}
      </p>
    );
  }
  return null;
}
