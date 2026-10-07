import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { AuthLayout } from '../components/AuthLayout'

export function Signup() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/signup', { username, password })
      toast.success('Success', {
        description: 'Account created. Please log in.',
      })
      navigate('/login')
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      toast.error('Error', {
        description: axiosError.response?.data?.message || 'Signup failed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card-solid rounded-lg border border-zinc-800/80 px-8 py-9">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          Create account on Perpetual Exchange
        </h1>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
          <div className="space-y-2 text-left">
            <Label htmlFor="email" className="text-[13px] font-bold">
              Email address
            </Label>
            <Input
              id="email"
              type="text"
              placeholder="you@email.com"
              required
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setUsername(e.target.value)
              }
              className="h-11 rounded-md border-zinc-800 bg-black placeholder:text-zinc-500 focus-visible:ring-zinc-700"
            />
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="password" className="text-[13px] font-bold">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                className="h-11 rounded-md border-zinc-800 bg-black pr-11 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-zinc-100 font-medium text-zinc-900 hover:bg-white !mt-7"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-[13px] text-zinc-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-zinc-50 transition-colors hover:underline"
          >
            Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
