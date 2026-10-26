import type { QuotationRequestDetailDto } from '../schemas/quotation';

/**
 * Auto-assign at Finalize is for standalone quotations only. A quotation started from an appraisal
 * task is created with that task's workflow instance (`workflowInstanceId`, required by the
 * backend's CreateFromTask); a standalone one never has it. `taskExecutionId` is not usable for
 * this: the task-start flow can leave it null.
 */
export const isStandaloneQuotation = (q: Pick<QuotationRequestDetailDto, 'workflowInstanceId'>) =>
  !q.workflowInstanceId;
