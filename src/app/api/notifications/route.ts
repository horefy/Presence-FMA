import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { ApiError } from "@/lib/crud";

/**
 * GET /api/notifications?unread=true&q=&page=&pageSize=
 * Liste les notifications de l'utilisateur connecte.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const sp = request.nextUrl.searchParams;

    const where: Record<string, unknown> = { userId: session.userId };
    if (sp.get("unread") === "true") where.readAt = null;

    const q = sp.get("q")?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { message: { contains: q } },
        { type: { contains: q } },
      ];
    }

    const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(sp.get("pageSize") ?? 20) || 20),
    );

    const [total, data, unread] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({
        where: { userId: session.userId, readAt: null },
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      unread,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/notifications
 * Corps : { "action": "read-all" } => marque toutes les notifications comme lues.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));

    if (body?.action !== "read-all") {
      throw new ApiError("Action inconnue.", 400);
    }

    const result = await prisma.notification.updateMany({
      where: { userId: session.userId, readAt: null },
      data: { readAt: new Date(), status: "READ" },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    return errorResponse(error);
  }
}
