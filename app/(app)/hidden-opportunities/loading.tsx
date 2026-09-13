import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/data/skeletons";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-7 w-44" />
      <TableSkeleton rows={10} cols={9} />
    </div>
  );
}
