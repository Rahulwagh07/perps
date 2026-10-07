import { PositionCard } from './PositionCard'
import { authAvatars } from './theme'

export function Showcase() {
  return (
    <div className="auth-showcase">
      <header className="auth-topbar">
        <div className="auth-brand">Perpetual Exchange</div>
      </header>
      <div className="auth-position-zone">
        <PositionCard />
      </div>
      <div className="auth-bottom">
        <div className="auth-eyebrow">Perpetual futures</div>
        <h2 className="auth-headline">
          Trade the
          <br />
          never-ending market<span className="auth-headline-dot">.</span>
        </h2>
        <div className="mt-5 flex items-center gap-6">
          <div className="flex -space-x-2">
            {authAvatars.map(t => (
              <span key={t} className="auth-avatar text-zinc-200">
                {t}
              </span>
            ))}
          </div>
          <div className="auth-proof-sub text-zinc-300">
            Trusted by 40,000+ traders &middot;{' '}
            <span className="text-zinc-500">99.99% uptime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
