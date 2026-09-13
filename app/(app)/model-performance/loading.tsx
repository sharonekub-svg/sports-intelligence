import { Skeleton } from "@/components/ui/skeleton";
import { MetricRowSkeleton, TableSkeleton } from "@/components/data/skeletons";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-7 w-36" />
      <div className="mt-6">
        <MetricRowSkeleton count={1} />
      </div>
      <div className="mt-8">
        <Skeleton className="h-5 w-52" />
        <TableSkeleton rows={4} cols={6} />
      </div>
    </div>
  );
}
