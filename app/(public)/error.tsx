"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/data/error-state";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16">
      <ErrorState title="קרתה תקלה בטעינת העמוד. נסה שוב בעוד רגע." onRetry={reset} />
    </div>
  );
}
