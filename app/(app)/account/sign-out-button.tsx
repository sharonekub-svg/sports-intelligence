"use client";

import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      התנתק
    </Button>
  );
}
