"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";

/** Fournit le contexte de session NextAuth a toute l'application. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
