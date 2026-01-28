import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

export const PriceAnalysisConfigSchema = z.object({
  approaches: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string(),
      appraisalValue: z.number(),
      methods: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          icon: z.string(),
          appraisalValue: z.number(),
        }),
      ),
    }),
  ),
});
export type PriceAnalysisConfig = z.infer<typeof PriceAnalysisConfigSchema>;

export async function fetchPriceAnalysisConfig(): Promise<PriceAnalysisConfig> {
  const res = await fetch(
    '/src/features/appraisal/components/priceAnalysis/data/priceAnalysis.config.json', // Is this secure?
    { cache: 'no-cache' },
  );
  if (!res.ok) throw new Error(`Config fetch failed (${res.status})`);
  const data = await res.json();
  return PriceAnalysisConfigSchema.parse(data);
}

export const usePriceAnalysisQuery = () => {
  return useQuery({
    queryKey: ['price-analysis-config'],
    queryFn: fetchPriceAnalysisConfig,

    // TODO: refresh and retry
  });
};
