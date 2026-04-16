type SelectOption = {
  value: string;
  label: string;
};

export function buildMethodProportionOptions(params: {
  sections: DCFSection[];
  assumptions: ReturnType<typeof getDCFFilteredAssumptions>;
}): SelectOption[] {
  const categories = params.sections
    .filter(section => section.categories)
    .flatMap(section => section.categories);

  return [
    ...params.sections.map(section => ({
      value: `section:${section.clientId}`,
      label: `Total - ${section.sectionName}`,
    })),
    ...categories.map(category => ({
      value: `category:${category.clientId}`,
      label: `Total - ${category.categoryName}`,
    })),
    ...params.assumptions.map(item => ({
      value: `assumption:${item.assumption.clientId}`,
      label: `${item.section.sectionName} - ${item.assumption.assumptionName ?? ''}`,
    })),
  ];
}
