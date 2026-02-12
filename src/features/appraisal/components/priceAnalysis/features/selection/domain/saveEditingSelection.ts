import type { PriceAnalysisGateway } from '@features/appraisal/components/priceAnalysis/features/selection/domain/priceAnalysisGateway.ts';

export async function saveEditingSelection(
  gateway: PriceAnalysisGateway,
  input: {
    appraisalId: string;
    selections: Array<{ approachType: string; methodTypes: string[] }>;
  },
) {
  for (const sel of input.selections) {
    const approachRes = await gateway.addApproach({
      appraisalId: input.appraisalId,
      approachType: sel.approachType,
    });

    await Promise.all(
      sel.methodTypes.map(methodType =>
        gateway.addMethod({
          appraisalId: input.appraisalId,
          approachId: approachRes.id,
          methodType,
        }),
      ),
    );
  }
}
