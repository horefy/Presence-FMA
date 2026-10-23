import { NextRequest, NextResponse } from "next/server";
import { delegate } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";

/**
 * GET /api/meta/options?model=Staff&labelFields=firstName,lastName&q=ras
 * Retourne les options d'un select relationnel.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const sp = request.nextUrl.searchParams;

    const model = sp.get("model");
    if (!model) {
      return NextResponse.json(
        { error: "Le parametre 'model' est obligatoire." },
        { status: 400 },
      );
    }

    const labelFields = (sp.get("labelFields") || "name")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    const q = sp.get("q")?.trim();
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 50) || 50));
    const filterRaw = sp.get("filter");

    const where: Record<string, unknown> = {};
    if (filterRaw) {
      try {
        Object.assign(where, JSON.parse(filterRaw));
      } catch {
        /* filtre ignore */
      }
    }
    if (q) {
      where.OR = labelFields.map((f) => ({ [f]: { contains: q } }));
    }

    const select: Record<string, boolean> = { id: true };
    for (const f of labelFields) select[f] = true;

    const rows = await delegate(model).findMany({
      where,
      select,
      take: limit,
      orderBy: labelFields.length
        ? { [labelFields[0]]: "asc" }
        : undefined,
    });

    const options = rows.map((r: Record<string, unknown>) => ({
      value: String(r.id),
      label:
        labelFields
          .map((f) => (r[f] === null || r[f] === undefined ? "" : String(r[f])))
          .filter(Boolean)
          .join(" ") || String(r.id),
    }));

    return NextResponse.json({ options });
  } catch (error) {
    return errorResponse(error);
  }
}
