export type ClientMessage = {
  method: 'SUBSCRIBE' | 'UNSUBSCRIBE'
  params: string[]
}
