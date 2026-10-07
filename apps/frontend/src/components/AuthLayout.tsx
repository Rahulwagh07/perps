import { Backdrop } from './auth/Backdrop'
import { Showcase } from './auth/Showcase'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <Backdrop />
      <div className="auth-shell-inner">
        <Showcase />
        <div className="auth-formzone">
          <div className="auth-form-inner">
            <div className="auth-mobile-brand">
              <div className="auth-mobile-name">Perpetual Exchange</div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
