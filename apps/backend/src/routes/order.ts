import type { Router } from 'express'
import express from 'express'

import { authenticate } from './middleware'
import { CreateOrder } from '../controllers/order'
const router: Router = express.Router()

router.post('/order', authenticate, CreateOrder)

export default router
