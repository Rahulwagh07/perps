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
const router: Router = express.Router()

router.post('/order', authenticate, CreateOrder)
router.get('/fills', authenticate, GetFills)
router.delete('/order/:orderId', authenticate, DeleteOrder)
router.get('/order/:orderId', authenticate, GetOrder)
router.get('/orders/open', authenticate, GetOpenOrders)
router.get('/orders', authenticate, GetOrders)

export default router
