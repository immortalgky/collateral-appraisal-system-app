import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

export const PriceAnalysisConfigSchema = z.object({
  approaches: z.array(
    z.object({
      id: z.string(),
      approachType: z.string(),
      label: z.string(),
      icon: z.string(),
      appraisalValue: z.number().nullable().optional(),
      methods: z.array(
        z
          .object({
            id: z.string(),
            methodType: z.string(),
            icon: z.string(),
            label: z.string(),
            appraisalValue: z.number().nullable().optional(),
            configurations: z.array(
              z
                .object({
                  type: z.string(),

                  // sale grid & direct configs
                  showQualitativeSection: z.boolean().nullable().optional(),
                  showInitialPriceSection: z.boolean().nullable().optional(),
                  showSecondRevisionSection: z.boolean().nullable().optional(),
                  showAdjustedValueSection: z.boolean().nullable().optional(),
                  showAdjustedWeightSection: z.boolean().nullable().optional(),
                  showAdjustFinalValueSection: z.boolean().nullable().optional(),
                })
                .passthrough(),
            ),
          })
          .passthrough(),
      ),
    }),
  ),
});
export type PriceAnalysisConfigType = z.infer<typeof PriceAnalysisConfigSchema>;

/** fetch price analysis configuration on json file. The configuration file consist of 1 approach can include which method */
export const useGetPriceAnalysisConfigQuery = () => {
  return useQuery({
    queryKey: ['price-analysis-config'],
    queryFn: async (): Promise<PriceAnalysisConfigType> => {
      const res = await fetch(
        '/src/features/appraisal/components/priceAnalysis/data/priceAnalysis.config.json',
        { cache: 'no-store' },
      );

      if (!res.ok) {
        throw new Error(`Config fetch failed (${res.status})`);
      }

      const json = await res.json();
      return PriceAnalysisConfigSchema.parse(json);
    },

    /** set stateTime infinit since this is a static config */
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
