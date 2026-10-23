import { NextRequest, NextResponse } from "next/server";
import { getResource } from "@/lib/registry";
import {
  deleteRow,
  getRow,
  translatePrismaError,
  updateRow,
} from "@/lib/crud";
import { assertPermission, errorResponse, requireSession } from "@/lib/api-helpers";

type Params = { params: Promise<{ resource: string; id: string }> };

async function resolve(params: Promise<{ resource: string; id: string }>) {
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource) return null;
  return { key, id, resource };
}

/** GET /api/<resource>/<id> : detail d'un enregistrement. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolve(params);
    if (!ctx) {
      return NextResponse.json({ error: "Ressource inconnue." }, { status: 404 });
    }
    const session = await requireSession();
    assertPermission(session, ctx.key, "read");

    const row = await getRow(ctx.resource, ctx.id, session);
    if (!row) {
      return NextResponse.json(
        { error: "Enregistrement introuvable." },
        { status: 404 },
      );
    }
    return NextResponse.json(row);
  } catch (error) {
    return errorResponse(error);
  }
}

/** PATCH /api/<resource>/<id> : mise a jour partielle. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolve(params);
    if (!ctx) {
      return NextResponse.json({ error: "Ressource inconnue." }, { status: 404 });
    }
    if (ctx.resource.readOnly) {
      return NextResponse.json(
        { error: "Cette ressource est en lecture seule." },
        { status: 405 },
      );
    }
    const session = await requireSession();
    assertPermission(session, ctx.key, "update");

    const body = await request.json();
    const updated = await updateRow(ctx.resource, ctx.id, body, session);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(translatePrismaError(error));
  }
}

/** PUT /api/<resource>/<id> : alias de PATCH. */
export async function PUT(request: NextRequest, { params }: Params) {
  return PATCH(request, { params });
}

/** DELETE /api/<resource>/<id> : suppression. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolve(params);
    if (!ctx) {
      return NextResponse.json({ error: "Ressource inconnue." }, { status: 404 });
    }
    if (ctx.resource.readOnly) {
      return NextResponse.json(
        { error: "Cette ressource est en lecture seule." },
        { status: 405 },
      );
    }
    const session = await requireSession();
    assertPermission(session, ctx.key, "delete");

    const result = await deleteRow(ctx.resource, ctx.id, session);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(translatePrismaError(error));
  }
}
