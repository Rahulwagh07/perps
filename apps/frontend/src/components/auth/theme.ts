export const authPalette = {
  accent: '#6ee7b7',
  accentSoft: '#a7f3d0',
  accentStrong: '#34d399',
  candleDown: '#fb7185',
  baseLine: '#ffffff',
} as const

export type AuthCandle = {
  h: number
  up: boolean
}

export const authCandles: AuthCandle[] = [
  { h: 30, up: true },
  { h: 48, up: false },
  { h: 40, up: true },
  { h: 62, up: true },
  { h: 36, up: false },
  { h: 54, up: true },
  { h: 72, up: true },
  { h: 44, up: false },
  { h: 58, up: true },
  { h: 38, up: false },
  { h: 66, up: true },
  { h: 50, up: true },
  { h: 34, up: false },
  { h: 56, up: true },
]

export const authPosition = {
  pair: 'BTC-PERP',
  side: 'Long',
  leverage: '12.5x',
  pnl: '+$4,231.88',
  mark: '67,432.1',
  change: '+2.41%',
  entry: '64,210.4',
  size: '2.480 BTC',
  liq: '59,012.0',
  latency: '11ms',
  latencyLabel: 'matching engine',
  volume: '$412M',
  volumeLabel: '24h volume · audited',
} as const

export const authAvatars = ['AK', 'JM', 'RS', '+'] as const

export const authSparkFill =
  'M0,58 L30,54 L60,56 L90,44 L120,46 L150,36 L180,38 L210,28 L240,30 L270,20 L300,24 L330,14 L360,16 L400,6 L400,72 L0,72 Z'

export const authSparkLine =
  'M0,58 L30,54 L60,56 L90,44 L120,46 L150,36 L180,38 L210,28 L240,30 L270,20 L300,24 L330,14 L360,16 L400,6'

export const authPulseOuter =
  'M 50,300 A 270,104 0 1,1 590,300 A 270,104 0 1,1 50,300'

export const authPulseInner =
  'M 162,300 A 158,60 0 1,0 478,300 A 158,60 0 1,0 162,300'
