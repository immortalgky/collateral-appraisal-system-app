import type { DirectComparisonType } from '../schemas/directComparisonForm';
import type { SaveComparativeAnalysisRequestType } from '../schemas';

interface mapDirectComparisonFormToSubmitSchemaProps {
  DirectComparisonForm: DirectComparisonType;
}

export function mapDirectComparisonFormToSubmitSchema({
  DirectComparisonForm,
}: mapDirectComparisonFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {}
