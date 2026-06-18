import {
  APPRAISAL_COMPANY_PARAMS,
  COLLATERAL_TYPE_PARAMS,
  IMPORT_CHANNEL_PARAMS,
  SOURCE_OF_DATA_PARAMS,
  STATUS_PARAMS,
} from '../constants/parameters';

export const getImportChannelLabel = (type: string | undefined) => {
  const option = IMPORT_CHANNEL_PARAMS.find(opt => opt.value === type);
  return option?.label ?? '-';
};

export const getSourceOfDataLabel = (type: string | undefined) => {
  const option = SOURCE_OF_DATA_PARAMS.find(opt => opt.value === type);
  return option?.label ?? '-';
};

export const getAppraisalCompanyLabel = (type: string | undefined) => {
  const option = APPRAISAL_COMPANY_PARAMS.find(opt => opt.value === type);
  return option?.label ?? '-';
};

export const getCollateralTypeLabel = (type: string | undefined) => {
  const option = COLLATERAL_TYPE_PARAMS.find(opt => opt.value === type);
  return option?.label ?? '-';
};

export const getStatusLabel = (type: string | undefined) => {
  const option = STATUS_PARAMS.find(opt => opt.value === type);
  return option?.label ?? '-';
};
