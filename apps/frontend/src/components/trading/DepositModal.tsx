import { useState } from 'react'
import { api } from '../../lib/api'
import { useUserDataStore } from '../../store/userData'
import { MAX_DEPOSIT_AMOUNT } from '../../lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loading03Icon } from 'hugeicons-react'

interface DepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DepositModal({ open, onOpenChange }: DepositModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [limitError, setLimitError] = useState(false)
  const setBalance = useUserDataStore(state => state.setBalance)

  const handleDeposit = async () => {
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error('Invalid amount', {
        description: 'Please enter a positive amount',
      })
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/balance/deposit', {
        amount: numAmount,
      })
      setBalance(data.available)
      toast.success('Deposit successful', {
        description: `$${numAmount.toLocaleString()} has been added to your account`,
      })
      setAmount('')
      onOpenChange(false)
    } catch (error) {
      console.log('failed to add balance', error)
      toast.error('Deposit failed')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Deposit Funds</DialogTitle>
          <DialogDescription>
            Add balance to your trading account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium">
              Amount (USDT)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                $
              </span>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="0.00"
                min="1"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value
                  if (val === '' || Number(val) <= MAX_DEPOSIT_AMOUNT) {
                    setAmount(val)
                    setLimitError(false)
                  } else {
                    setLimitError(true)
                  }
                }}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-lg h-12 pl-8 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
              />
            </div>
            {limitError && (
              <p className="text-red-500 text-xs mt-1">
                Maximum deposit is ${MAX_DEPOSIT_AMOUNT.toLocaleString()}
              </p>
            )}
          </div>

          <Button
            id="deposit-submit-btn"
            onClick={handleDeposit}
            disabled={loading || !amount || Number(amount) <= 0}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base transition-all disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loading03Icon className="animate-spin h-4 w-4" />
                Processing...
              </span>
            ) : (
              `Deposit${amount ? ` $${Number(amount).toLocaleString()}` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
