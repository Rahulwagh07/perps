import type { Router } from 'express'
import express from 'express'
import { authenticate } from './middleware'
import { GetPositions } from '../controllers/position'

const router: Router = express.Router()

router.get('/positions', authenticate, GetPositions)

export default router
