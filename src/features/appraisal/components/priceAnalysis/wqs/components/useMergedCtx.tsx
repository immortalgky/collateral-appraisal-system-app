import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

type WatchMap = Record<string, string>;

type useMergedCtxProps = {
  baseCtx: Partial<Ctx>;
  watch: WatchMap;
};
export const useMergedCtx = <Ctx = Record<string, any>,>({
  baseCtx = {},
  watch = {},
}: useMergedCtxProps) => {
  const { control } = useFormContext();

  const watchNames = useMemo(() => Object.values(watch), [watch]);
  const watchVals = useWatch({ control, name: watchNames, defaultValue: [] }) as any[];

  const watchedObj = useMemo(() => {
    const keys = Object.keys(watch);
    return Object.fromEntries(keys.map((k, i) => [k, watchVals[i]]));
  }, [watch, watchVals]);

  return useMemo(
    () => ({ ...(baseCtx as any), ...(watchedObj as any) }) as Ctx,
    [baseCtx, watchedObj],
  );
};
