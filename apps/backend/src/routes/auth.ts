import type { Router } from 'express'
import express from 'express'
import { SignIn, SignUp } from '../controllers/auth'
const router: Router = express.Router()

router.post('/signup', SignUp)
router.post('/signin', SignIn)

export default router
