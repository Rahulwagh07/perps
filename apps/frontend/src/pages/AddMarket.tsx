import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Loading03Icon } from 'hugeicons-react'

export function AddMarket() {
  const [slug, setSlug] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAddMarket = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/market', { slug, imageUrl, secret })
      toast.success('Market Created', {
        description: 'Market has been successfully created',
      })
      navigate('/perps')
    } catch (error) {
      console.log(error)
      toast.error('Falied to create market')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-zinc-50 text-center">
            Add Market
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Create a new trading market
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMarket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-zinc-400">
                Slug (e.g. BTC_USDT)
              </Label>
              <Input
                id="slug"
                placeholder="Enter market slug (SOL_USDT)"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-zinc-400">
                Image URL
              </Label>
              <Input
                id="imageUrl"
                placeholder="Enter image url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret" className="text-zinc-400">
                Admin Secret
              </Label>
              <Input
                id="secret"
                type="password"
                placeholder="Enter admin secret"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loading03Icon className="animate-spin h-4 w-4" />
                  Creating...
                </span>
              ) : (
                'Add Market'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
