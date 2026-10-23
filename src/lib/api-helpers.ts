import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiError, type SessionCtx } from "@/lib/crud";
import { hasPermission } from "@/lib/permissions";

/** Recupere la session courante ou leve une 401. */
export async function requireSession(): Promise<SessionCtx> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("Authentification requise.", 401);
  }
  return {
    userId: session.user.id,
    establishmentId: session.user.establishmentId ?? null,
    permissions: session.user.permissions ?? [],
    roles: (session.user.roles ?? []).map((r) => ({ code: r.code, name: r.name })),
  };
}

/** Verifie le droit d'action sur une ressource. */
export function assertPermission(
  session: SessionCtx,
  resource: string,
  action: "read" | "create" | "update" | "delete",
) {
  if (!hasPermission(session.permissions, resource, action)) {
    throw new ApiError(
      "Vous n'avez pas les droits necessaires pour cette operation.",
      403,
    );
  }
}

/** Convertit une exception en reponse JSON standardisee. */
export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status },
    );
  }
  console.error("[api]", error);
  return NextResponse.json(
    { error: "Erreur interne du serveur." },
    { status: 500 },
  );
}
