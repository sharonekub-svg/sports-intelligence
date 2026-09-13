import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/data/skeletons";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-7 w-52" />
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
