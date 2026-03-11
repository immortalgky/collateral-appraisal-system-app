export type SearchCategory = 'requests' | 'customers' | 'properties';
export type SearchFilter = 'all' | SearchCategory;

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  category: SearchCategory;
  navigateTo: string;
  icon?: string;
  metadata?: Record<string, string>;
}

export interface SearchResponse {
  results: Record<SearchCategory, SearchResultItem[]>;
  totalCount: number;
}
