export function MethodParameterBasedOnTierOfPropertyValueModal({
  name,
  properties,
}: {
  name: string;
  properties: Record<string, unknown>[];
}) {
  const landTitles = (properties ?? []).find(p => p.propertyType === 'L')?.titles;
  const landGovPrice = (landTitles ?? []).reduce(
    (acc, curr) => (acc += curr.governmentPrice ?? 0),
    0,
  );
  console.log(landTitles, lanGovPrice);
  return <></>;
}
