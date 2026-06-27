import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import marketRoutes from './routes/market'
import balanceRoutes from './routes/balance'
import orderRoutes from './routes/order'
import positionRoutes from './routes/position'
import { configDotenv } from 'dotenv'
configDotenv()

const app = express()
app.use(cors())
app.use(express.json())
app.use(authRoutes)
app.use(marketRoutes)
app.use(balanceRoutes)
app.use(orderRoutes)
app.use(positionRoutes)

const PORT = process.env.PORT || 3000

export const QUEUE_ID = `backend-${process.pid}-${Date.now()}`

app.listen(PORT, () => {
  console.log('backend is running on port', PORT)
})
