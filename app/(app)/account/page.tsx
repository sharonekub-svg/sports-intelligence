import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/session";
import { isPro } from "@/lib/auth/isPro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SignOutButton from "./sign-out-button";

export default async function AccountPage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");

  const pro = await isPro(user.id);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">החשבון שלי</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">פרטי חשבון</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">אימייל</span>
            <span>{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">סטטוס מנוי</span>
            <Badge variant={pro ? "default" : "secondary"}>
              {pro ? "Pro" : "חינמי"}
            </Badge>
          </div>
          {!pro && (
            <Link href="/account/billing" className="mt-2 text-sm underline">
              שדרג ל-Pro
            </Link>
          )}
          {pro && (
            <Link href="/account/billing" className="mt-2 text-sm underline">
              נהל את המנוי שלי
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
