import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
