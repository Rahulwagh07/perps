export const SNAPSHOT_INTERVAL = 5 * 60 * 1000

// fee rates in basis points. 1 bps = 0.01%
export const TAKER_FEE_BPS = 4n
export const MAKER_FEE_BPS = 2n
export const BPS_DIVISOR = 10000n

//minimum to keep the position open
export const MAINTENANCE_MARGIN_BPS = 50n //0.5%

//portion of trading fees that goes to insurance fund
export const INSURANCE_FEE_RATIO_BPS = 2000n //20%

//cap on how much the funding rate can be per settelment
export const MAX_FUNDING_RATE_BPS = 100n //1%

export const FUNDING_INTERVAL_MS = 60 * 60 * 1000
