import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import ScannerClient from "./scanner-client";

export default async function ScannerPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  const pro = await isPro(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">Universal Scanner</h1>
      <ScannerClient pro={pro} />
    </div>
  );
}
