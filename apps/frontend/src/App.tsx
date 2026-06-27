import { useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Trade } from './pages/Trade'
import { useAuthStore } from './store/auth'
import { Toaster } from './components/ui/sonner'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800">
        <Routes>
          <Route path="/" element={<Navigate to="/perps" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/perps"
            element={
              <ProtectedRoute>
                <Trade />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-center" />
      </div>
    </Router>
  )
}

export default App
