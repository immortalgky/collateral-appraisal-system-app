import type { ListBoxItem } from '@/shared/components';
import type { DCFCategory } from '../types/dcf';

export function buildDiscountedCashFlowCategoryOptions(categories: DCFCategory[]): ListBoxItem[] {
  return categories.map((c: DCFCategory) => ({ value: c.clientId, label: c.categoryName }));
}
