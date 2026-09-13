import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-lg font-semibold">העמוד לא נמצא</p>
        <p className="mt-1 text-sm text-muted-foreground">
          ייתכן שהקישור שגוי, או שהעמוד הוסר.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
        חזרה לדף הבית
      </Link>
    </div>
  );
}
