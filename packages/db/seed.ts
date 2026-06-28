import 'dotenv/config'
import { prisma } from './db'

async function main() {
  console.log('seeding database...')

  const markets = [
    {
      slug: 'SOL_USDC',
      imageUrl:
        'https://wsrv.nl/?w=48&h=48&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FSo11111111111111111111111111111111111111112%2Flogo.png',
    },
    {
      slug: 'BTC_USDT',
      imageUrl:
        'https://wsrv.nl/?w=48&h=48&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2F3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh%2Flogo.png',
    },
  ]

  for (const m of markets) {
    let market = await prisma.market.findFirst({
      where: { slug: m.slug },
    })

    if (!market) {
      market = await prisma.market.create({
        data: {
          slug: m.slug,
          imageUrl: m.imageUrl,
        },
      })
      console.log(`created market: ${market.slug}`)
    } else {
      console.log(`market ${market.slug} already exists.`)
    }
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
