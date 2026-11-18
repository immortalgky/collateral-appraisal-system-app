import { useState, type MouseEvent } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Icon, Input, NumberInput } from '@/shared/components';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import { appraisalFeesQueryOptions, type AppraisalFee } from '@/features/appraisal/api/fee';
import {
  BANK_ABSORB_FEE_TYPES,
  BANK_ABSORB_SHOW_TYPES,
  isFullBankAbsorb,
  nextAbsorbAmount,
} from '@/features/appraisal/utils/feePaymentRules';
import type {
  AppraisalSummaryDto,
  CompanyQuotationDto,
  CompanyQuotationItemDto,
} from '../../schemas/quotation';
import type { FeeDraft, FeeDrafts } from '../../hooks/useWinnerFeeDrafts';
import { splitPayment, type SavedFee } from '../../utils/winnerFee';
import QuotedFeeSummary from './QuotedFeeSummary';

const amount = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type FeeChange = Omit<FeeDraft, 'feeId'>;

/** The fee change when one appraisal moves to another Fee Payment Type. */
const changeFeeType = (
  current: { feePaymentType: string; bankAbsorbAmount: number | null },
  toType: string,
  fee: AppraisalFee | undefined,
): FeeChange => ({
  feePaymentType: toType,
  bankAbsorbAmount: nextAbsorbAmount(current.feePaymentType, toType, {
    bankAbsorbAmount: current.bankAbsorbAmount ?? 0,
    totalFeeAfterVAT: fee?.totalFeeAfterVAT ?? 0,
  }),
});

const matchesQuery = (appraisal: AppraisalSummaryDto, query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [appraisal.appraisalNumber, appraisal.customerName].some(text =>
    text?.toLowerCase().includes(needle),
  );
};

interface WinnerFeeReviewProps {
  appraisals: AppraisalSummaryDto[];
  company: CompanyQuotationDto;
  drafts: FeeDrafts;
  onDraftChange: (appraisalId: string, draft: FeeDraft, saved: SavedFee | undefined) => void;
  onReset: () => void;
}

/** Fee type and bank absorb per appraisal, next to the picked company's quote. */
const WinnerFeeReview = ({
  appraisals,
  company,
  drafts,
  onDraftChange,
  onReset,
}: WinnerFeeReviewProps) => {
  const { t } = useTranslation('quotation');
  // Same cache entries the rest of the app uses, read together so the totals can add them up.
  const feeQueries = useQueries({
    queries: appraisals.map(a => appraisalFeesQueryOptions(a.appraisalId)),
  });

  const rows = appraisals.map((appraisal, i) => {
    const fees = feeQueries[i]?.data;
    // The fee list also holds fees of rejected or cancelled assignments; show the one that will be updated.
    const savedFee = fees?.find(fee => fee.id === appraisal.feeId) ?? fees?.[0];
    // The quotation carries the fee id; the fee query is the fallback for an API without it.
    const feeId = appraisal.feeId ?? savedFee?.id;
    const draft = drafts[appraisal.appraisalId];
    // The draft wins over the saved fee until the dialog is confirmed or closed.
    const feePaymentType = draft?.feePaymentType ?? savedFee?.feePaymentType ?? '';
    const bankAbsorbAmount = draft ? draft.bankAbsorbAmount : (savedFee?.bankAbsorbAmount ?? 0);
    const item = company.items.find(it => it.appraisalId === appraisal.appraisalId);
    const payment = item
      ? splitPayment(item.quotedPrice, bankAbsorbAmount, isFullBankAbsorb(feePaymentType))
      : null;
    const isDraft = !!draft;
    return { appraisal, feeId, savedFee, feePaymentType, bankAbsorbAmount, item, payment, isDraft };
  });

  const [query, setQuery] = useState('');
  const visibleRows = rows.filter(row => matchesQuery(row.appraisal, query));

  // Same rule as the row's own dropdown: editable once its saved fee has loaded.
  const editableRows = visibleRows.filter(row => row.feeId && row.savedFee);

  const rowsToChange = (toType: string) =>
    editableRows.filter(row => row.feePaymentType !== toType);

  const applyToAll = (toType: string) => {
    rowsToChange(toType).forEach(row => {
      if (!row.feeId) return;
      onDraftChange(
        row.appraisal.appraisalId,
        { feeId: row.feeId, ...changeFeeType(row, toType, row.savedFee) },
        row.savedFee,
      );
    });
  };

  const totalBankPays = rows.reduce((sum, row) => sum + (row.payment?.bankPays ?? 0), 0);
  const totalCustomerPays = rows.reduce((sum, row) => sum + (row.payment?.customerPays ?? 0), 0);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-sm font-semibold text-(--palette-ink)">{t('winnerFee.title')}</h3>
        <p className="text-xs text-(--palette-ink-2)">{t('winnerFee.saveOnConfirmHint')}</p>
      </div>
      {/* The toolbar sits inside the scroller so its two columns line up with the rows under
          the scrollbar; the 1-unit inset keeps focus rings from being clipped. */}
      <div className="max-h-[48vh] overflow-y-auto px-1">
        <div className="sticky top-0 z-10 grid grid-cols-2 gap-2 bg-(--palette-surface) pt-1 pb-2 px-1.5 mb-1">
          <SearchBox query={query} onQueryChange={setQuery} />
          <ApplyAllControl
            hasEditableRows={editableRows.length > 0}
            countChanges={toType => rowsToChange(toType).length}
            draftCount={Object.keys(drafts).length}
            onApply={applyToAll}
            onClear={onReset}
          />
        </div>
        <div className="flex flex-col gap-2 pb-1">
          {visibleRows.map(row => (
            <AppraisalFeeRow
              key={row.appraisal.appraisalId}
              {...row}
              onDraftChange={onDraftChange}
            />
          ))}
          {visibleRows.length === 0 && (
            <p className="py-6 text-center text-sm text-(--palette-ink-2)">
              {t('winnerFee.noMatch')}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 rounded-lg bg-(--palette-surface-2) px-3 py-2 text-sm text-(--palette-ink)">
        <div className="flex items-center justify-between">
          <span>{t('winnerFee.totalNet')}</span>
          <span className="tabular-nums">{amount.format(company.totalQuotedPrice ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t('winnerFee.totalBankAbsorb')}</span>
          <span className="tabular-nums">
            {totalBankPays > 0 && '−'} {amount.format(totalBankPays)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-(--palette-line-soft) pt-1 font-semibold">
          <span>{t('winnerFee.totalCustomerPays')}</span>
          <span className="tabular-nums">{amount.format(totalCustomerPays)}</span>
        </div>
      </div>
    </section>
  );
};

interface SearchBoxProps {
  query: string;
  onQueryChange: (query: string) => void;
}

const SearchBox = ({ query, onQueryChange }: SearchBoxProps) => {
  const { t } = useTranslation('quotation');

  return (
    <div className="min-w-0">
      <Input
        type="search"
        aria-label={t('winnerFee.search')}
        placeholder={t('winnerFee.searchPlaceholder')}
        leftIcon={<Icon name="magnifying-glass" className="size-3.5!" />}
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        onKeyDown={e => {
          // Esc clears a typed search first; the dialog skips its own Esc once it is prevented.
          if (e.key === 'Escape' && query !== '') {
            e.preventDefault();
            onQueryChange('');
          }
        }}
      />
    </div>
  );
};

interface ApplyAllControlProps {
  hasEditableRows: boolean;
  countChanges: (feePaymentType: string) => number;
  draftCount: number;
  onApply: (feePaymentType: string) => void;
  onClear: () => void;
}

const ApplyAllControl = ({
  hasEditableRows,
  countChanges,
  draftCount,
  onApply,
  onClear,
}: ApplyAllControlProps) => {
  const { t } = useTranslation(['quotation', 'appraisal']);
  const [selectedType, setSelectedType] = useState('');
  const changeCount = selectedType ? countChanges(selectedType) : 0;
  const [holdApply, setHoldApply] = useState(false);

  const apply = (e: MouseEvent) => {
    onApply(selectedType);
    setSelectedType('');
    // detail is 0 for Enter / Space: the key swap below already moves focus off the button.
    setHoldApply(e.detail > 0);
  };

  const clear = () => {
    onClear();
    setSelectedType('');
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <Dropdown
          name="applyAllFeePaymentType"
          aria-label={t('appraisal:fee.feePaymentTypeLabel')}
          placeholder={t('winnerFee.applyAllPlaceholder')}
          group="FeePaymentMethod"
          value={selectedType || null}
          onChange={value => setSelectedType(value ?? '')}
          disabled={!hasEditableRows}
        />
      </div>
      {/* Clear takes Apply's place; the keys remount the button so focus leaves it.
          mouseleave is on the wrapper: a disabled button does not fire it in every browser. */}
      <div className="shrink-0" onMouseLeave={() => setHoldApply(false)}>
        {!holdApply && draftCount > 0 && selectedType === '' ? (
          <Button key="clear" variant="dangerOutline" className="cursor-pointer" onClick={clear}>
            {t('winnerFee.clear', { count: draftCount })}
          </Button>
        ) : (
          <Button
            key="apply"
            variant="outline"
            className="cursor-pointer w-24"
            onClick={apply}
            disabled={changeCount === 0}
          >
            {selectedType
              ? t('winnerFee.applyAllCount', { count: changeCount })
              : t('winnerFee.applyAll')}
          </Button>
        )}
      </div>
    </div>
  );
};

interface AppraisalFeeRowProps {
  appraisal: AppraisalSummaryDto;
  feeId: string | null | undefined;
  savedFee: AppraisalFee | undefined;
  feePaymentType: string;
  bankAbsorbAmount: number | null;
  item: CompanyQuotationItemDto | undefined;
  isDraft: boolean;
  onDraftChange: (appraisalId: string, draft: FeeDraft, saved: SavedFee | undefined) => void;
}

const AppraisalFeeRow = ({
  appraisal,
  feeId,
  savedFee,
  feePaymentType,
  bankAbsorbAmount,
  item,
  isDraft,
  onDraftChange,
}: AppraisalFeeRowProps) => {
  const { t } = useTranslation('quotation');

  const handleChange = (change: FeeChange) => {
    if (feeId) onDraftChange(appraisal.appraisalId, { feeId, ...change }, savedFee);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <AppraisalFeeEditor
        appraisal={appraisal}
        fee={savedFee}
        quotedFee={item?.quotedPrice}
        feePaymentType={feePaymentType}
        bankAbsorbAmount={bankAbsorbAmount}
        isDraft={isDraft}
        onChange={handleChange}
      />
      {item ? (
        <QuotedFeeSummary
          item={item}
          maxDays={appraisal.maxAppraisalDays}
          bankAbsorbAmount={bankAbsorbAmount}
          isFullAbsorb={isFullBankAbsorb(feePaymentType)}
        />
      ) : (
        <div className="grid place-items-center rounded-lg border border-dashed border-(--palette-line) text-sm text-(--palette-ink-2)">
          {t('winnerFee.noQuote')}
        </div>
      )}
    </div>
  );
};

interface AppraisalFeeEditorProps {
  appraisal: AppraisalSummaryDto;
  fee: AppraisalFee | undefined;
  quotedFee: number | undefined;
  feePaymentType: string;
  bankAbsorbAmount: number | null;
  isDraft: boolean;
  onChange: (change: FeeChange) => void;
}

const AppraisalFeeEditor = ({
  appraisal,
  fee,
  quotedFee,
  feePaymentType,
  bankAbsorbAmount,
  isDraft,
  onChange,
}: AppraisalFeeEditorProps) => {
  const { t } = useTranslation(['appraisal', 'quotation']);
  const propertyType = useParameterDescription('PropertyType', appraisal.propertyType ?? '');

  const subtitle = [
    appraisal.customerName,
    propertyType || appraisal.propertyType,
    appraisal.maxAppraisalDays != null &&
      t('quotation:winnerFee.maxDaysShort', { count: appraisal.maxAppraisalDays }),
  ]
    .filter(Boolean)
    .join(' · ');

  const changeType = (toType: string) =>
    onChange(changeFeeType({ feePaymentType, bankAbsorbAmount }, toType, fee));

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-(--palette-line) bg-(--palette-surface) p-3">
      <div className="min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-(--palette-ink)">
            {appraisal.appraisalNumber ?? '—'}
          </p>
          {isDraft && <span className={'rounded-full shrink-0 bg-amber-500 p-1'} />}
        </div>
        {subtitle && (
          <p className="truncate text-xs text-(--palette-ink-2)" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
      <Dropdown
        name={`feePaymentType-${appraisal.appraisalId}`}
        label={t('fee.feePaymentTypeLabel')}
        required
        group="FeePaymentMethod"
        value={feePaymentType}
        onChange={changeType}
        disabled={!fee}
      />
      {BANK_ABSORB_SHOW_TYPES.includes(feePaymentType) && (
        <NumberInput
          name={`bankAbsorbAmount-${appraisal.appraisalId}`}
          label={t('fee.bankAbsorbAmount')}
          required={BANK_ABSORB_FEE_TYPES.includes(feePaymentType)}
          decimalPlaces={2}
          min={0}
          max={quotedFee}
          value={bankAbsorbAmount}
          onChange={e => onChange({ feePaymentType, bankAbsorbAmount: e.target.value })}
          placeholder="0.00"
        />
      )}
    </div>
  );
};

export default WinnerFeeReview;
