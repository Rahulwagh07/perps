export type RedisClient = {
  xAdd(
    key: string,
    id: string,
    fields: Record<string, string>
  ): Promise<string | null>
}

export type MarketMapping = {
  marketId: string
  slug: string
  binanceSymbol: string
}
