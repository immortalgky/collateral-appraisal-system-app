import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useGetUsers } from '@features/userManagement/api/users';
import { useLocalizedCompanyName } from '@shared/utils/companyName';
import { isValidEmail } from '@shared/utils/validationUtils';

export interface RecipientSuggestion {
  /** Unique within a list: the group and the entity's id (two people may share an address). */
  key: string;
  group: 'company' | 'staff';
  name: string;
  email: string;
}

/** Most rows the list shows, across both groups. */
const MAX_RESULTS = 8;

const MIN_CHARS = 2;

/** The key of a browse list: no search text, so it cannot be mistaken for a term (a term holds no "@"). */
const BROWSE = '@';
const BROWSE_ROWS = 5;

/**
 * What the typed text asks for: '' = nothing yet; '@' alone = browse the first few companies and
 * staff; a term = search. Plain text needs two characters, a leading "@" starts the search at one;
 * an "@" anywhere else means an address is being typed, so the box stays a plain field.
 */
export const searchTermOf = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed === '@') return BROWSE;
  const typed = trimmed.replace(/^@/, '').trim();
  const min = trimmed.startsWith('@') ? 1 : MIN_CHARS;
  return typed.length >= min && !typed.includes('@') ? typed : '';
};

/**
 * The addresses of a master-data email field, the way the API reads them (AssignmentEmailCcRoleExpansion
 * .PlainAddresses): split on "," / ";", keep a bare address or the address inside "Name <addr>", drop
 * anything else, no repeats (case-insensitive). "a@x.com; b@x.com" is two addresses, junk is none.
 */
export const plainAddresses = (value: string | null | undefined): string[] => {
  const isPlain = (v: string) => v.length <= 254 && isValidEmail(v);
  const found = (value ?? '')
    .split(/[,;]/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      if (isPlain(part)) return part;
      const open = part.lastIndexOf('<');
      if (open < 0 || !part.endsWith('>')) return null;
      const inner = part.slice(open + 1, -1).trim();
      return isPlain(inner) ? inner : null;
    })
    .filter((a): a is string => a !== null);
  return found.filter((a, i) => found.findIndex(b => b.toLowerCase() === a.toLowerCase()) === i);
};

interface CompanyHit {
  id: string;
  name: string;
  nameLocal?: string | null;
  email?: string | null;
  isActive: boolean;
}

/**
 * Companies and bank staff to pick as email recipients, by name / username / email, 250 ms after the
 * last keystroke. Only people and companies with an address; staff only when active and not locked.
 * Companies: GET /companies?search (name, local name, tax id; no email match, no paging, so the
 * page trims). Staff: GET /auth/users?scope=Bank&isActive=true (name, username, email).
 */
export const useRecipientSearch = (text: string) => {
  const live = searchTermOf(text);
  const debounced = useDebounce(live, 250);
  // Browsing has nothing to wait for: it opens at once.
  const term = live === BROWSE ? live : debounced;
  const browse = live === BROWSE;
  const localizeCompanyName = useLocalizedCompanyName();
  // The debounced term lags a keystroke behind: a cleared field shows nothing at once.
  const enabled = term !== '' && live !== '';

  const companies = useQuery({
    queryKey: ['recipient-search', 'companies', term],
    queryFn: async (): Promise<CompanyHit[]> => {
      const { data } = await axios.get('/companies', {
        params: { search: term === BROWSE ? undefined : term, activeOnly: true },
      });
      return (data.companies ?? data.items ?? []).map(
        (c: {
          id: string;
          name: string;
          nameLocal?: string | null;
          email?: string | null;
          isActive: boolean;
        }) => c,
      );
    },
    enabled,
    staleTime: 30_000,
    // The last results stay up while the next ones load, so the list does not flicker per keystroke.
    placeholderData: keepPreviousData,
    retry: false,
  });
  const staff = useGetUsers(
    { scope: 'Bank', isActive: true, search: term === BROWSE ? undefined : term, pageSize: 20 },
    { enabled, keepPrevious: true },
  );

  // Pending = the term changed and the rows on screen are the last term's (the debounce has not caught
  // up, or a placeholder is showing): they must not be picked. A refetch of the same term is not pending.
  const pending =
    live !== '' && (live !== term || companies.isPlaceholderData || staff.isPlaceholderData);
  // Any request in flight, for the spinner row only: current rows stay pickable while it refreshes.
  const waiting = pending || companies.isFetching || staff.isFetching;
  // One source failed: the other's results still show.
  const partial = enabled && (companies.isError || staff.isError);
  if (live === '') {
    return {
      suggestions: [] as RecipientSuggestion[],
      active: false,
      browse: false,
      pending,
      waiting,
      partial,
    };
  }

  // One row per address the API would accept: a field holding "a; b" is two rows, junk is none.
  const companyRows: RecipientSuggestion[] = (companies.data ?? [])
    .filter(c => c.isActive)
    .flatMap(c =>
      plainAddresses(c.email).map(email => ({
        key: `company:${c.id}:${email.toLowerCase()}`,
        group: 'company' as const,
        name: localizeCompanyName(c.name, c.nameLocal),
        email,
      })),
    );
  const staffRows: RecipientSuggestion[] = (staff.data?.items ?? [])
    .filter(u => u.isActive && !u.isLocked)
    .flatMap(u =>
      plainAddresses(u.email).map(email => ({
        key: `staff:${u.id}:${email.toLowerCase()}`,
        group: 'staff' as const,
        name: `${u.firstName} ${u.lastName}`.trim() || u.username,
        email,
      })),
    );

  if (browse) {
    // The first few of each, by name.
    const byName = (a: RecipientSuggestion, b: RecipientSuggestion) => a.name.localeCompare(b.name);
    return {
      suggestions: [
        ...companyRows.sort(byName).slice(0, BROWSE_ROWS),
        ...staffRows.sort(byName).slice(0, BROWSE_ROWS),
      ],
      active: true,
      browse: true,
      pending,
      waiting,
      partial,
    };
  }

  // Both groups keep a place: companies take what staff leave of the 8, at least half.
  const companyShown = companyRows.slice(
    0,
    Math.max(MAX_RESULTS / 2, MAX_RESULTS - staffRows.length),
  );
  const staffShown = staffRows.slice(0, MAX_RESULTS - companyShown.length);
  return {
    suggestions: [...companyShown, ...staffShown],
    active: true,
    browse: false,
    pending,
    waiting,
    partial,
  };
};
