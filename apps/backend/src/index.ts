import express from 'express'
import authRoutes from './routes/auth'
import { configDotenv } from 'dotenv'
configDotenv()

const app = express()
app.use(express.json())
app.use(authRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log('backend is running on port 3000', PORT)
})
