import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { ApiError } from "@/lib/crud";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/<id>
 * Corps : { "read": true | false } => marque la notification comme lue / non lue.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
      throw new ApiError("Notification introuvable.", 404);
    }

    const body = await request.json().catch(() => ({}));
    const read = body?.read !== false;

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        readAt: read ? new Date() : null,
        status: read ? "READ" : "PENDING",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/notifications/<id> : supprime une notification. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
      throw new ApiError("Notification introuvable.", 404);
    }

    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ id });
  } catch (error) {
    return errorResponse(error);
  }
}
