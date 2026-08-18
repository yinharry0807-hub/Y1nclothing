import { AppShell } from "@/components/AppShell";
import { isAuthorized } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorized = await isAuthorized();
  if (!authorized) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
