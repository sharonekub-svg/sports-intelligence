"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function UnsaveButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnsave() {
    setLoading(true);
    await fetch(`/api/saved-matches?matchId=${matchId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleUnsave} disabled={loading}>
      הסר
    </Button>
  );
}
