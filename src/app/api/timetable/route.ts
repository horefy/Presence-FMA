import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { ApiError } from "@/lib/crud";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";

/**
 * GET /api/timetable?classGroupId=...&teacherId=...
 * Retourne les lignes d'emploi du temps, groupees par jour.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasPermission(session.permissions, "timetable-entries", "read")) {
      throw new ApiError("Droits insuffisants.", 403);
    }

    const sp = request.nextUrl.searchParams;
    const classGroupId = sp.get("classGroupId") || undefined;
    const teacherId = sp.get("teacherId") || undefined;

    const scoped =
      !isSuperAdmin(session.permissions) && session.establishmentId
        ? session.establishmentId
        : null;

    const entries = await prisma.timetableEntry.findMany({
      where: {
        ...(classGroupId ? { classGroupId } : {}),
        ...(teacherId ? { teacherId } : {}),
        ...(scoped ? { classGroup: { establishmentId: scoped } } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        room: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    const days: Record<number, typeof entries> = {};
    for (let d = 1; d <= 7; d++) days[d] = [];
    for (const e of entries) {
      (days[e.dayOfWeek] ??= []).push(e);
    }

    return NextResponse.json({ entries, days });
  } catch (error) {
    return errorResponse(error);
  }
}
