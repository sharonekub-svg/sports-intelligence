"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/data/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <ErrorState title="קרתה תקלה בטעינת העמוד. הצוות שלנו קיבל התראה." onRetry={reset} />
    </div>
  );
}
