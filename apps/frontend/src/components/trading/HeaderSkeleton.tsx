import { Skeleton } from '@/components/ui/skeleton'

export function HeaderSkeleton() {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 sticky top-0 z-50">
      <Skeleton className="w-[200px] h-9 bg-zinc-900/50" />
      <div className="flex items-center gap-4">
        <Skeleton className="w-24 h-8 bg-zinc-900/50" />
        <Skeleton className="w-24 h-8 bg-zinc-900/50" />
        <Skeleton className="w-8 h-8 bg-zinc-900/50 rounded-md" />
      </div>
    </header>
  )
}
