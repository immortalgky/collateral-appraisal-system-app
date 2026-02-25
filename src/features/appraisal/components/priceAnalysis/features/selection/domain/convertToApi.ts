export function convertToAddApproachApi(approachType: string) {
  if (approachType === 'MARAPPR') return 'Market';
  if (approachType === 'COSTAPPR') return 'Cost';
  if (approachType === 'INCOMEAPPR') return 'Income';
  if (approachType === 'RESAPPR') return 'Residual';
  return '';
}

export function convertToAddMethodApi(methodType: string) {
  if (methodType === 'WQS_MARKET') return 'WQS';
  if (methodType === 'SAG_MARKET') return 'SaleGrid';
  if (methodType === 'DC_MARKET') return 'DirectComparison';

  if (methodType === 'WQS_COST') return 'WQS';
  if (methodType === 'SAG_COST') return 'SaleGrid';
  if (methodType === 'DC_COST') return 'DirectComparison';
  return '';
}
