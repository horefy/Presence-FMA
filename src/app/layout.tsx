import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Gestion des presences et du personnel",
  description:
    "Application web de gestion des presences et du personnel : etablissements, personnel, apprenants, emploi du temps et appel.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      {/* suppressHydrationWarning : des extensions navigateur injectent des
          attributs sur <body> avant l'hydratation React. */}
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
