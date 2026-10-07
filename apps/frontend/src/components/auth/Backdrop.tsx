import { EngineArt } from './EngineArt'

export function Backdrop() {
  return (
    <>
      <div className="auth-grid" aria-hidden />
      <div className="auth-glow-a" />
      <div className="auth-glow-b" />
      <div className="auth-engine-stage">
        <EngineArt />
      </div>
      <div className="auth-vignette" aria-hidden />
    </>
  )
}
