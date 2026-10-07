import { Activity, ShieldCheck, TrendingUp, Zap } from 'lucide-react'
import { authPalette, authPosition, authSparkFill, authSparkLine } from './theme'

export function PositionCard() {
  return (
    <div className="auth-float-wrap">
      <div className="auth-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="auth-asset-tile">&#8383;</span>
            <div>
              <div className="auth-pair">{authPosition.pair}</div>
              <div className="auth-side">
                {authPosition.side} &middot; {authPosition.leverage}
              </div>
            </div>
          </div>
          <span className="auth-badge">
            <span className="auth-live-dot" />
            LIVE
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="auth-micro-label text-zinc-400">
              Unrealized PnL
            </div>
            <div className="auth-pnl-value">{authPosition.pnl}</div>
          </div>
          <div className="auth-micro-label text-right tabular-nums">
            <div className="text-zinc-400">Mark {authPosition.mark}</div>
            <div className="auth-delta">
              <TrendingUp size={12} /> {authPosition.change}
            </div>
          </div>
        </div>
        <svg viewBox="0 0 400 72" className="auth-spark" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={authPalette.accent}
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={authPalette.accent}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path d={authSparkFill} fill="url(#pnlFill)" />
          <path
            d={authSparkLine}
            fill="none"
            stroke={authPalette.accent}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="auth-facts">
          <div>
            <div className="text-zinc-500">Entry</div>
            <div className="mt-0.5 text-zinc-200">{authPosition.entry}</div>
          </div>
          <div>
            <div className="text-zinc-500">Size</div>
            <div className="mt-0.5 text-zinc-200">{authPosition.size}</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-500">Liq.</div>
            <div className="mt-0.5 text-zinc-200">{authPosition.liq}</div>
          </div>
        </div>
      </div>
      <div className="auth-chip auth-chip-latency">
        <span className="auth-chip-tile">
          <Zap size={15} />
        </span>
        <div>
          <div className="auth-chip-num">{authPosition.latency}</div>
          <div className="auth-chip-sub text-zinc-400">
            {authPosition.latencyLabel}
          </div>
        </div>
      </div>
      <div className="auth-chip auth-chip-volume">
        <span className="auth-chip-tile-plain text-zinc-200">
          <Activity size={15} />
        </span>
        <div>
          <div className="auth-chip-num">{authPosition.volume}</div>
          <div className="auth-chip-sub flex items-center gap-1 text-zinc-400">
            <ShieldCheck size={11} className="auth-chip-check" />
            {authPosition.volumeLabel}
          </div>
        </div>
      </div>
    </div>
  )
}
