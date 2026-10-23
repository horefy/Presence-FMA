import { NextRequest, NextResponse } from "next/server";
import { getResource } from "@/lib/registry";
import {
  createRow,
  listRows,
  translatePrismaError,
} from "@/lib/crud";
import { assertPermission, errorResponse, requireSession } from "@/lib/api-helpers";

type Params = { params: Promise<{ resource: string }> };

/** GET /api/<resource> : liste paginee, recherche, tri et filtres. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { resource: key } = await params;
    const resource = getResource(key);
    if (!resource) {
      return NextResponse.json({ error: "Ressource inconnue." }, { status: 404 });
    }

    const session = await requireSession();
    assertPermission(session, key, "read");

    const result = await listRows(
      resource,
      request.nextUrl.searchParams,
      session,
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/<resource> : creation. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { resource: key } = await params;
    const resource = getResource(key);
    if (!resource) {
      return NextResponse.json({ error: "Ressource inconnue." }, { status: 404 });
    }
    if (resource.readOnly) {
      return NextResponse.json(
        { error: "Cette ressource est en lecture seule." },
        { status: 405 },
      );
    }

    const session = await requireSession();
    assertPermission(session, key, "create");

    const body = await request.json();
    const created = await createRow(resource, body, session);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(translatePrismaError(error));
  }
}
