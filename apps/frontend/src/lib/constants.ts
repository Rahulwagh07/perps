export const DEFAULT_SLIPPAGE_BPS = 200
export const SLIPPAGE_OPTIONS_BPS = [50, 100, 200, 500]
export const CHART_INTERVALS = ['1m', '5m', '15m'] as const
export type ChartInterval = (typeof CHART_INTERVALS)[number]
