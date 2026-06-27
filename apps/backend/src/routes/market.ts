import type { Router } from 'express'
import express from 'express'
import { CreateMarket, GetMarkets } from '../controllers/market'
import { GetKlines } from '../controllers/klines'
import { authenticate } from './middleware'
const router: Router = express.Router()

router.post('/market', authenticate, CreateMarket)
router.get('/markets', GetMarkets)
router.get('/klines', GetKlines)

export default router
