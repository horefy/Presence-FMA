import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        name: session.user.name ?? "Utilisateur",
        email: session.user.email ?? "",
        roles: session.user.roles ?? [],
        permissions: session.user.permissions ?? [],
      }}
    >
      {children}
    </AppShell>
  );
}
