import { Skeleton } from "@/components/ui/skeleton";
import { MetricRowSkeleton, MatchCardGridSkeleton } from "@/components/data/skeletons";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-7 w-40" />
      <div className="mt-6">
        <MetricRowSkeleton />
      </div>
      <div className="mt-8">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4">
          <MatchCardGridSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
