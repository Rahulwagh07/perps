import type { Router } from 'express'
import express from 'express'

import { authenticate } from './middleware'
import {
  CreateOrder,
  DeleteOrder,
  GetOpenOrders,
  GetOrder,
  GetOrders,
} from '../controllers/order'
import { GetFills } from '../controllers/fills'
import { GetDepth } from '../controllers/depth'
const router: Router = express.Router()

router.post('/order', authenticate, CreateOrder)
router.get('/fills', authenticate, GetFills)
router.delete('/order/:orderId', authenticate, DeleteOrder)
router.get('/order/:orderId', authenticate, GetOrder)
router.get('/orders/open', authenticate, GetOpenOrders)
router.get('/orders', authenticate, GetOrders)
router.get('/depth/:marketId', GetDepth)

export default router
