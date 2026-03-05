export const templateMgmtKeys = {
  factors: ['market-comparable-factors'] as const,
  mcTemplates: ['market-comparable-templates'] as const,
  mcTemplateDetail: (id: string) => ['market-comparable-templates', id] as const,
  compTemplates: ['comparative-analysis-templates'] as const,
  compTemplateDetail: (id: string) => ['comparative-analysis-templates', id] as const,
};
