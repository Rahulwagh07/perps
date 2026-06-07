import { createClient } from 'redis'

export const client = createClient({
  url: process.env.REDIS_URL,
})

client.on('error', err => {
  console.error('Redis Client Error', err)
})

await client.connect()

console.log('Connected to Redis')
