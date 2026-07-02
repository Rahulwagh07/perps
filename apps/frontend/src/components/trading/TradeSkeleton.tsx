import { Skeleton } from '../ui/skeleton'

export function TradeSkeleton() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 min-h-[600px] lg:min-h-0">
        {/* Chart Area */}
        <div className="flex-[3] min-h-[400px] lg:min-h-0 relative flex flex-col">
          <div className="absolute top-4 left-4 flex gap-4">
            <Skeleton className="w-32 h-8 bg-zinc-900/50" />
            <Skeleton className="w-48 h-8 bg-zinc-900/50" />
          </div>
        </div>
        
        {/* User Panel */}
        <div className="flex-[2] min-h-[300px] flex flex-col border-t border-zinc-800">
          <div className="border-b border-zinc-800 flex items-end h-12 px-4 gap-6">
            <Skeleton className="w-20 h-6 bg-zinc-900/50 rounded-b-none" />
            <Skeleton className="w-24 h-6 bg-zinc-900/50 rounded-b-none" />
            <Skeleton className="w-16 h-6 bg-zinc-900/50 rounded-b-none" />
          </div>
          <div className="p-4 space-y-4 mt-2">
            <Skeleton className="w-full h-8 bg-zinc-900/50" />
            <Skeleton className="w-full h-8 bg-zinc-900/50" />
            <Skeleton className="w-full h-8 bg-zinc-900/50" />
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-[620px] border-l border-zinc-800 shrink-0">
        {/* Orderbook */}
        <div className="flex-1 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800 h-[72px] flex flex-col justify-between">
            <Skeleton className="w-24 h-5 bg-zinc-900/50" />
            <div className="flex justify-between mt-2">
              <Skeleton className="w-12 h-3 bg-zinc-900/50" />
              <Skeleton className="w-12 h-3 bg-zinc-900/50" />
              <Skeleton className="w-12 h-3 bg-zinc-900/50" />
            </div>
          </div>
          <div className="p-2 flex-1 flex flex-col justify-center gap-3">
             {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex justify-between px-2">
                  <Skeleton className="w-12 h-4 bg-zinc-900/50" />
                  <Skeleton className="w-12 h-4 bg-zinc-900/50" />
                  <Skeleton className="w-12 h-4 bg-zinc-900/50" />
                </div>
             ))}
          </div>
        </div>
        
        {/* Order Entry */}
        <div className="w-full sm:w-[320px] p-4 flex flex-col bg-zinc-950">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 h-12 p-1 bg-zinc-900 rounded-md">
             <Skeleton className="w-1/2 h-full bg-zinc-800 rounded" />
             <Skeleton className="w-1/2 h-full bg-zinc-800 rounded" />
          </div>
          {/* Market/Limit */}
          <div className="flex gap-2 mb-6">
             <Skeleton className="w-24 h-9 bg-zinc-900/50" />
             <Skeleton className="flex-1 h-9 bg-zinc-900/50" />
          </div>
          {/* Form */}
          <div className="space-y-6">
             <div className="space-y-2">
               <Skeleton className="w-24 h-4 bg-zinc-900/50" />
               <Skeleton className="w-full h-10 bg-zinc-900/50" />
             </div>
             
             <div className="mt-8 space-y-4 border-t border-zinc-800 pt-6">
               <div className="flex justify-between">
                 <Skeleton className="w-6 h-4 bg-zinc-900/50" />
                 <Skeleton className="w-8 h-4 bg-zinc-900/50" />
                 <Skeleton className="w-6 h-4 bg-zinc-900/50" />
               </div>
               <Skeleton className="w-full h-2 bg-zinc-900/50" />
             </div>

             <div className="mt-8 space-y-3 border-t border-zinc-800 pt-6">
               <div className="flex justify-between"><Skeleton className="w-20 h-4 bg-zinc-900/50" /><Skeleton className="w-16 h-4 bg-zinc-900/50" /></div>
               <div className="flex justify-between"><Skeleton className="w-24 h-4 bg-zinc-900/50" /><Skeleton className="w-16 h-4 bg-zinc-900/50" /></div>
               <div className="flex justify-between"><Skeleton className="w-20 h-4 bg-zinc-900/50" /><Skeleton className="w-16 h-4 bg-zinc-900/50" /></div>
             </div>
             
             <Skeleton className="w-full h-12 mt-6 bg-zinc-900/50" />
          </div>
        </div>
      </div>
    </div>
  )
}
