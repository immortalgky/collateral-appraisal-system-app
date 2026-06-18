import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { FormField } from '@/shared/components/form';
import {
  getPropertyTypeValidationConfig,
  type PropertyTypeValidationConfig,
} from '../configs/propertyTypeValidation';

export interface GroupPropertyRef {
  id: string;
  /** Backend property type code or display name (the registry normalises both). */
  typeCode: string;
  sequenceNumber: number;
}

export type MandatoryValidationStatus = 'Passed' | 'Failed' | 'Skipped';

export interface MandatoryValidationResult {
  isLoading: boolean;
  status: MandatoryValidationStatus;
  /** Per-property summaries of missing mandatory fields (empty when passed/skipped). */
  messages: string[];
}

/** Map a field name → its human label, for readable failure messages. */
const buildLabelLookup = (fields: FormField[]): Record<string, string> => {
  const lookup: Record<string, string> = {};
  for (const f of fields) {
    if (f.name) lookup[f.name] = f.label ?? f.name;
  }
  return lookup;
};

/** Collect the missing-field labels (and section fallbacks) for one property. */
function collectMissing(
  config: PropertyTypeValidationConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
): string[] {
  const mapped = config.mapResponseToForm(response);
  const labels = buildLabelLookup(config.labelFields);
  const missing = new Set<string>();

  for (const slice of config.validations) {
    const result = slice.schema.safeParse(slice.pick(mapped));
    if (result.success) continue;

    const fieldNames = result.error.issues
      .map(issue => String(issue.path[0] ?? ''))
      .filter(Boolean);

    if (fieldNames.length > 0) {
      fieldNames.forEach(name => missing.add(labels[name] ?? name));
    } else {
      // Failure with no field path (e.g. a whole required section is null).
      missing.add(slice.label);
    }
  }

  return Array.from(missing);
}

/**
 * Front-end "mandatory fields" rule for a property group.
 *
 * For each property whose type has a config, fetches its detail and runs the SAME schema(s)
 * the data-entry form uses (base detail + required lease-agreement/rental tabs for lease types).
 * A property whose detail cannot be loaded is skipped (never a false block). Returns one
 * rolled-up step.
 *
 * Plug-and-play: pass any appraisalId + property refs (property group today, others later).
 */
export function usePropertyGroupMandatoryValidation(
  appraisalId: string | undefined,
  properties: GroupPropertyRef[],
  enabled: boolean,
): MandatoryValidationResult {
  // Pair each property with its validation config; only configured types are validated.
  const applicable = useMemo(
    () =>
      properties
        .map(p => ({ property: p, config: getPropertyTypeValidationConfig(p.typeCode) }))
        .filter((x): x is { property: GroupPropertyRef; config: PropertyTypeValidationConfig } =>
          Boolean(x.config),
        ),
    [properties],
  );

  const queries = useQueries({
    queries: applicable.map(({ property, config }) => ({
      queryKey: [
        'appraisal',
        appraisalId,
        'property',
        property.id,
        'mandatory-validation',
        config.detailEndpoint,
      ],
      enabled: enabled && !!appraisalId,
      gcTime: 0,
      staleTime: 0,
      retry: false,
      queryFn: async () => {
        const { data } = await axios.get(
          `/appraisals/${appraisalId}/properties/${property.id}/${config.detailEndpoint}`,
        );
        return data;
      },
    })),
  });

  return useMemo<MandatoryValidationResult>(() => {
    if (applicable.length === 0) {
      return { isLoading: false, status: 'Skipped', messages: [] };
    }
    if (queries.some(q => q.isFetching)) {
      return { isLoading: true, status: 'Skipped', messages: [] };
    }

    const messages: string[] = [];
    let validatedCount = 0;

    applicable.forEach(({ property, config }, index) => {
      const query = queries[index];
      if (!query?.isSuccess) return; // errored / not loaded → skip this property
      validatedCount += 1;

      const missing = collectMissing(config, query.data);
      if (missing.length > 0) {
        messages.push(
          `Property #${property.sequenceNumber} (${property.typeCode}): missing ${missing.join(', ')}.`,
        );
      }
    });

    const status: MandatoryValidationStatus =
      messages.length > 0 ? 'Failed' : validatedCount > 0 ? 'Passed' : 'Skipped';

    return { isLoading: false, status, messages };
  }, [applicable, queries]);
}

export default usePropertyGroupMandatoryValidation;
