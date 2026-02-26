const cache = new Map<string, Intl.NumberFormat>();

interface FormatterConfig {
  style?: Intl.NumberFormatOptions['style'];
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currency?: string; // required when style === "currency"
}

const defaultConfig: Required<
  Pick<FormatterConfig, 'style' | 'minimumFractionDigits' | 'maximumFractionDigits'>
> = {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export const formatNumber = (
  value: number,
  config: FormatterConfig = defaultConfig,
  locale = 'en-US',
) => {
  const finalConfig = { ...defaultConfig, ...config };

  const fmt = new Intl.NumberFormat(locale, {
    style: finalConfig.style,
    minimumFractionDigits: finalConfig.minimumFractionDigits,
    maximumFractionDigits: finalConfig.maximumFractionDigits,
    ...(finalConfig.currency ? { currency: finalConfig.currency } : {}),
  });

  return Number(fmt.format(value));
};
