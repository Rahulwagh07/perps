import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { api } from '../lib/api'
import { DEMO_USERNAME, DEMO_PASSWORD } from '../lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'

export function Login() {
  const [username, setUsername] = useState(DEMO_USERNAME)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setToken = useAuthStore(state => state.setToken)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post('/signin', { username, password })
      setToken(response.data.token)
      toast.success('Success', { description: 'Logged in successfully' })
      navigate('/perps')
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Error', {
        description: err.response?.data?.message || 'Login failed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-950">
      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Login
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Perpetual Futures Exchange
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700"
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-800 focus-visible:ring-zinc-700"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-semibold"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="text-sm text-center text-zinc-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-zinc-50 hover:underline transition-colors"
              >
                Create account
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
