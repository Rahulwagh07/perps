import express from 'express'
import authRoutes from './routes/auth'
import marketRoutes from './routes/market'
import { configDotenv } from 'dotenv'
import { createClient } from 'redis'
configDotenv()

const app = express()
app.use(express.json())
app.use(authRoutes)
app.use(marketRoutes)

const PORT = process.env.PORT || 3000

export const redis = await createClient({ url: process.env.REDIS_URL })
  .on('error', err => console.log('redis error', err))
  .connect()

app.listen(PORT, () => {
  console.log('backend is running on port 3000', PORT)
})
