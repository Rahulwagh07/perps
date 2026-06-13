import type { Router } from 'express'
import express from 'express'
import { authenticate } from './middleware'
import { Deposit, GetBalance } from '../controllers/balance'

const router: Router = express.Router()

router.get('/balance', authenticate, GetBalance)
router.post('/balance/deposit', authenticate, Deposit)

export default router
