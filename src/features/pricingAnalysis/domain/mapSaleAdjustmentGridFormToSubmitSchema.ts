import type { SaleAdjustmentGridType } from '../schemas/saleAdjustmentGridForm';
import type { SaveComparativeAnalysisRequestType } from '../schemas';

interface mapSaleAdjustmentGridFormToSubmitSchamaProps {
  SaleAdjustmentGridForm: SaleAdjustmentGridType;
}
export function mapSaleAdjustmentGridFormToSubmitSchama({
  SaleAdjustmentGridForm,
}: mapSaleAdjustmentGridFormToSubmitSchamaProps): SaveComparativeAnalysisRequestType {}
