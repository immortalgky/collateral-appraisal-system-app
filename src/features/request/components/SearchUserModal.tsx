import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useDebounce } from '@/shared/hooks/useDebounce';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Avatar from '@/shared/components/Avatar';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { RequestorDtoType } from '../schemas/form';
import { useSearchRequestors, type RequestorInfoDto } from '../api/requestors';

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: RequestorDtoType) => void;
  /** The requestor currently set on the form — shown in the summary card and marked in the list. */
  initialRequestor?: RequestorDtoType | null;
  /** Summary card only, no search (e.g. read-only mode). */
  readOnly?: boolean;
}

const SKELETON_ROWS = 4;

/** `a · b · c`, leaving out whatever is empty. */
const joinParts = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

/** A name that is only dashes or blanks ("- -", what an account without a name comes through as) is no name. */
const realName = (name?: string | null) => (name && /[^\s\-–—]/.test(name) ? name.trim() : '');
/** The name, or the employee code when there is none. */
const displayName = (user: { name?: string | null; employeeId: string }) =>
  realName(user.name) || user.employeeId;
/** Avatar takes initials from the first letter of each word, so the code's first two characters go in as two words. */
const avatarName = (user: { name?: string | null; employeeId: string }) =>
  realName(user.name) || Array.from(user.employeeId.slice(0, 2)).join(' ');

const costCenterOf = (u: {
  costCenterCode?: string | null;
  costCenterDescription?: string | null;
}) =>
  u.costCenterCode && u.costCenterDescription
    ? `${u.costCenterCode} - ${u.costCenterDescription}`
    : (u.costCenterCode ?? u.costCenterDescription ?? null);

const SearchUserModal = ({
  isOpen,
  onClose,
  onSelect,
  initialRequestor,
  readOnly,
}: SearchUserModalProps) => {
  const { t } = useTranslation(['request', 'common']);
  const listId = useId();
  const [query, setQuery] = useState('');
  // employeeId is the selection key; the row stays selected only while it is in the results.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const term = useDebounce(query.trim(), 300);
  const searching = term.length > 0;
  const { data, isLoading, isError, refetch } = useSearchRequestors(term);
  // Typing ahead of the debounce: the rows on screen belong to the previous term.
  const pending = query.trim() !== term;
  const results = pending ? [] : (data ?? []);
  const selected = results.find(u => u.employeeId === selectedId) ?? null;

  const currentId = initialRequestor?.employeeId ?? null;
  const isCurrent = (u: RequestorInfoDto) => !!currentId && u.employeeId === currentId;
  const confirmBlocked = !selected || isCurrent(selected);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedId(null);
    }
  }, [isOpen]);

  const optionId = (id: string) => `${listId}-${id}`;

  const confirm = (user: RequestorInfoDto | null) => {
    if (!user || isCurrent(user)) return;
    // Map to RequestorDtoType — exclude the auth GUID (userId); backend persists employeeId.
    onSelect({
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      contactNo: user.contactNo,
      aoCode: user.aoCode,
      costCenterCode: user.costCenterCode,
      costCenterDescription: user.costCenterDescription,
      department: user.department,
    });
    onClose();
  };

  const move = (delta: number) => {
    if (results.length === 0) return;
    const at = results.findIndex(u => u.employeeId === selectedId);
    const next = results[Math.min(Math.max(at + delta, 0), results.length - 1)];
    setSelectedId(next.employeeId);
    document.getElementById(optionId(next.employeeId))?.scrollIntoView?.({ block: 'nearest' });
  };

  const onSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      confirm(selected);
    }
  };

  const currentName = initialRequestor?.employeeId
    ? displayName({ ...initialRequestor, employeeId: initialRequestor.employeeId })
    : '';
  const currentCostCenter = initialRequestor ? costCenterOf(initialRequestor) : null;
  // Only what is present; the AO code and cost centre as small `label value` pairs.
  const currentPairs: [string, string][] = [
    [t('fields.requestorAoCode'), initialRequestor?.aoCode ?? ''],
    [t('fields.requestorCostCenterCode'), currentCostCenter ?? ''],
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('searchUser.modalTitle')} size="lg" compact>
      <div className="flex flex-col gap-3">
        <section aria-label={t('searchUser.current')} className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="m-0 mb-1.5 text-xs font-medium text-gray-500">{t('searchUser.current')}</p>
          {initialRequestor?.employeeId ? (
            <div className="flex items-start gap-2.5">
              <Avatar
                name={avatarName({ ...initialRequestor, employeeId: initialRequestor.employeeId })}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold text-gray-900" title={currentName}>
                  {currentName}
                </p>
                <p className="m-0 break-words text-xs text-gray-500">
                  {joinParts(initialRequestor.employeeId, initialRequestor.department)}
                </p>
                {(initialRequestor.email || initialRequestor.contactNo) && (
                  <p className="m-0 break-words text-xs text-gray-500">
                    {joinParts(initialRequestor.email, initialRequestor.contactNo)}
                  </p>
                )}
                {currentPairs.some(([, value]) => value) && (
                  <p className="m-0 mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                    {currentPairs
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <span key={label}>
                          {label} <span className="text-gray-700">{value}</span>
                        </span>
                      ))}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="m-0 text-xs text-gray-500">{t('searchUser.noRequestor')}</p>
          )}
        </section>

        {readOnly ? (
          <div className="flex justify-end pt-1">
            <Button variant="outline" onClick={onClose}>
              {t('common:actions.close')}
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"
              />
              <input
                type="text"
                role="combobox"
                aria-expanded={searching}
                aria-controls={listId}
                aria-activedescendant={selected ? optionId(selected.employeeId) : undefined}
                aria-label={t('searchUser.searchPlaceholder')}
                placeholder={t('searchUser.searchPlaceholder')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus // eslint-disable-line jsx-a11y/no-autofocus -- a search dialog: typing is the first thing to do
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('searchUser.clearSearch')}
                  title={t('searchUser.clearSearch')}
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded text-gray-400 hover:text-gray-600"
                >
                  <Icon name="xmark" style="solid" className="text-xs" />
                </button>
              )}
            </div>

            <div className="flex min-h-4 items-baseline justify-between gap-3 text-xs text-gray-500">
              <span>{t('searchUser.searchHint')}</span>
              {searching && !pending && !isLoading && !isError && (
                <span className="shrink-0 font-medium text-gray-700" aria-live="polite">
                  {t('searchUser.found', { n: formatNumber(results.length) })}
                </span>
              )}
            </div>

            {searching && (
              <div
                id={listId}
                role="listbox"
                aria-label={t('searchUser.modalTitle')}
                className="max-h-[17rem] overflow-y-auto rounded-lg border border-gray-200"
              >
                {(pending || isLoading) &&
                  Array.from({ length: SKELETON_ROWS }, (_, i) => (
                    <div
                      key={i}
                      aria-hidden
                      className="flex items-center gap-2.5 border-b border-gray-100 px-3 py-2 last:border-b-0"
                    >
                      <div className="size-7 shrink-0 animate-pulse rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                        <div className="h-2.5 w-52 animate-pulse rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}

                {isError && !pending && !isLoading && (
                  <div
                    role="alert"
                    className="flex flex-col items-center gap-2 px-4 py-8 text-center"
                  >
                    <p className="m-0 text-sm font-medium text-gray-800">
                      {t('searchUser.errorTitle')}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => void refetch()}>
                      {t('searchUser.retry')}
                    </Button>
                  </div>
                )}

                {!pending && !isLoading && !isError && results.length === 0 && (
                  <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                    <p className="m-0 text-sm font-medium text-gray-800">
                      {t('searchUser.emptyTitle')}
                    </p>
                    <p className="m-0 text-xs text-gray-500">{t('searchUser.emptyHint')}</p>
                  </div>
                )}

                {!pending &&
                  !isLoading &&
                  !isError &&
                  results.map(user => {
                    const isSelected = user.employeeId === selectedId;
                    const detail = joinParts(user.employeeId, user.department, user.email);
                    return (
                      // Options are not focusable by design: focus stays in the search box, which
                      // carries the keys (aria-activedescendant), so the option takes only the pointer.
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                      <div
                        key={user.employeeId}
                        id={optionId(user.employeeId)}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => setSelectedId(user.employeeId)}
                        onDoubleClick={() => confirm(user)}
                        className={clsx(
                          'flex cursor-pointer items-center gap-2.5 border-b border-gray-100 px-3 py-2 last:border-b-0',
                          isSelected ? 'bg-primary/5' : 'hover:bg-gray-50',
                        )}
                      >
                        <Avatar name={avatarName(user)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-gray-900">
                              {displayName(user)}
                            </span>
                            {isCurrent(user) && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                                {t('searchUser.currentBadge')}
                              </span>
                            )}
                          </div>
                          <span className="block truncate text-xs text-gray-500" title={detail}>
                            {detail}
                          </span>
                        </div>
                        {isSelected && (
                          <Icon
                            name="check"
                            style="solid"
                            className="shrink-0 text-sm text-primary"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="m-0 text-xs text-gray-500">{t('searchUser.footerHint')}</p>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t('common:actions.cancel')}
                </Button>
                {/* The title sits on a wrapper: a disabled button shows none of its own. */}
                <span
                  title={
                    confirmBlocked
                      ? selected
                        ? t('searchUser.confirmSame')
                        : t('searchUser.confirmNone')
                      : undefined
                  }
                >
                  <Button
                    variant="primary"
                    onClick={() => confirm(selected)}
                    disabled={confirmBlocked}
                  >
                    {t('common:actions.confirm')}
                  </Button>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SearchUserModal;
