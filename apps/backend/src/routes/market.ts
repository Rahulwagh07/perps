import type { Router } from 'express'
import express from 'express'
import { CreateMarket } from '../controllers/market'
import { authenticate } from './middleware'
const router: Router = express.Router()

router.post('/market', authenticate, CreateMarket)

export default router
