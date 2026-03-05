import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useLinkComparable, useUnlinkComparable } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';
import type {
  GetMarketComparableByIdResponseType,
  LinkedComparableType,
  MarketComparableDetailType,
} from '../schemas';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';

interface UseLinkedComparablesProps {
  pricingAnalysisId: string | undefined;
  methodId: string | undefined;
  /** All market surveys available to this pricing analysis */
  marketSurveys: MarketComparableDetailType[];
  /** Already-linked comparables from GET comparative-factors */
  linkedComparables: LinkedComparableType[] | undefined;
}

/**
 * Manages the link between market comparables and a pricing method.
 *
 * - Fetches full survey details for each linked comparable directly
 * - When user selects/deselects from modal, diffs and calls link/unlink APIs
 * - Returns the resolved `comparativeSurveys` for use in panel state
 */
export function useLinkedComparables({
  pricingAnalysisId,
  methodId,
  marketSurveys,
  linkedComparables,
}: UseLinkedComparablesProps) {
  const linkMutation = useLinkComparable();
  const unlinkMutation = useUnlinkComparable();

  // Track linked comparables with their linkIds for unlink
  const [linkMap, setLinkMap] = useState<Map<string, string>>(new Map()); // marketComparableId → linkId
  const [comparativeSurveys, setComparativeSurveys] = useState<MarketComparableDetailType[]>([]);
  const initializedRef = useRef(false);

  // Fetch full details for each linked comparable directly from the API
  // Uses React Query cache — if already fetched by useEnrichedPricingAnalysis, it's instant
  const linkedIds = (linkedComparables ?? []).map(lc => lc.marketComparableId);
  const linkedDetailQueries = useQueries({
    queries: linkedIds.map(id => ({
      queryKey: pricingAnalysisKeys.marketComparableDetail(id),
      queryFn: async (): Promise<GetMarketComparableByIdResponseType> => {
        const { data } = await axios.get(`/market-comparables/${id}`);
        return data as GetMarketComparableByIdResponseType;
      },
      enabled: !!id,
      staleTime: Infinity,
      retry: 1,
    })),
  });

  const allLinkedLoaded = linkedIds.length === 0 || linkedDetailQueries.every(q => !q.isLoading);

  // Resolve linkedComparables once all detail queries are loaded
  useEffect(() => {
    if (initializedRef.current || !linkedComparables || !allLinkedLoaded) return;
    if (linkedComparables.length === 0) {
      initializedRef.current = true;
      return;
    }

    const resolved: MarketComparableDetailType[] = [];
    const newLinkMap = new Map<string, string>();

    for (let i = 0; i < linkedComparables.length; i++) {
      const linked = linkedComparables[i];
      // Try fetched query first, then fall back to marketSurveys
      const fetchedSurvey = linkedDetailQueries[i]?.data?.marketComparable;
      const survey = fetchedSurvey ?? marketSurveys.find(s => s.id === linked.marketComparableId);
      if (survey) {
        resolved.push(survey);
        newLinkMap.set(linked.marketComparableId, linked.linkId);
      }
    }

    // Sort by displaySequence
    resolved.sort((a, b) => {
      const seqA = linkedComparables.find(l => l.marketComparableId === a.id)?.displaySequence ?? 0;
      const seqB = linkedComparables.find(l => l.marketComparableId === b.id)?.displaySequence ?? 0;
      return seqA - seqB;
    });

    setComparativeSurveys(resolved);
    setLinkMap(newLinkMap);
    initializedRef.current = true;
  }, [linkedComparables, allLinkedLoaded, linkedDetailQueries, marketSurveys]);

  /**
   * Called when user saves the modal selection.
   * Diffs current vs new, calls link/unlink APIs, updates local state.
   */
  const syncSelection = useCallback(
    async (selectedSurveys: MarketComparableDetailType[]) => {
      if (!pricingAnalysisId || !methodId) return;

      const currentIds = new Set(comparativeSurveys.map(s => s.id!));
      const selectedIds = new Set(selectedSurveys.map(s => s.id!));

      // Surveys to link (in selection but not currently linked)
      const toLink = selectedSurveys.filter(s => !currentIds.has(s.id));
      // Surveys to unlink (currently linked but not in selection)
      const toUnlink = comparativeSurveys.filter(s => !selectedIds.has(s.id));

      const newLinkMap = new Map(linkMap);

      // Execute unlinks
      const unlinkPromises = toUnlink.map(async survey => {
        const linkId = linkMap.get(survey.id!);
        if (!linkId) return;
        try {
          await unlinkMutation.mutateAsync({
            pricingAnalysisId,
            methodId,
            linkId,
          });
          newLinkMap.delete(survey.id!);
        } catch {
          toast.error(`Failed to unlink ${survey.surveyName ?? 'comparable'}`);
        }
      });

      // Execute links
      const linkPromises = toLink.map(async (survey, index) => {
        const displaySequence = comparativeSurveys.length - toUnlink.length + index + 1;
        try {
          const result = await linkMutation.mutateAsync({
            pricingAnalysisId,
            methodId,
            request: {
              marketComparableId: survey.id!,
              displaySequence,
            },
          });
          newLinkMap.set(survey.id!, result.linkId);
        } catch {
          toast.error(`Failed to link ${survey.surveyName ?? 'comparable'}`);
        }
      });

      await Promise.all([...unlinkPromises, ...linkPromises]);

      setLinkMap(newLinkMap);
      setComparativeSurveys(selectedSurveys);
    },
    [pricingAnalysisId, methodId, comparativeSurveys, linkMap, linkMutation, unlinkMutation],
  );

  const isLinking = linkMutation.isPending || unlinkMutation.isPending;

  return {
    comparativeSurveys,
    syncSelection,
    isLinking,
    isInitialized: initializedRef.current,
  };
}
