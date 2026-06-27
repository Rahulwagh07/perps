export const CHART_INTERVALS = ['1m', '5m', '15m'] as const
export type ChartInterval = typeof CHART_INTERVALS[number]
