import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { ApiError } from "@/lib/crud";
import { hasPermission } from "@/lib/permissions";

type Params = { params: Promise<{ sessionId: string }> };

const VALID_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
  "LEFT_EARLY",
] as const;

/**
 * GET /api/attendance/sheet/[sessionId]
 * Feuille d'appel : seance + eleves inscrits + presences deja saisies.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!hasPermission(session.permissions, "learner-attendances", "read")) {
      throw new ApiError("Droits insuffisants.", 403);
    }

    const { sessionId } = await params;

    const seance = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        classGroup: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true } },
        teacher: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
        room: { select: { id: true, name: true } },
      },
    });

    if (!seance) {
      return NextResponse.json(
        { error: "Seance introuvable." },
        { status: 404 },
      );
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classGroupId: seance.classGroupId, status: "ACTIVE" },
      include: {
        learner: {
          select: {
            id: true,
            registrationNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { learner: { lastName: "asc" } },
    });

    const attendances = await prisma.learnerAttendance.findMany({
      where: { sessionId },
    });

    const existingByLearner = new Map(
      attendances.map((a) => [a.learnerId, a]),
    );

    const rows = enrollments.map((e) => {
      const existing = existingByLearner.get(e.learnerId);
      return {
        learnerId: e.learnerId,
        registrationNumber: e.learner.registrationNumber,
        firstName: e.learner.firstName,
        lastName: e.learner.lastName,
        gender: e.learner.gender,
        photoUrl: e.learner.photoUrl,
        attendanceId: existing?.id ?? null,
        status: existing?.status ?? "PRESENT",
        arrivalTime: existing?.arrivalTime ?? null,
        departureTime: existing?.departureTime ?? null,
        lateMinutes: existing?.lateMinutes ?? 0,
        comment: existing?.comment ?? null,
        validatedAt: existing?.validatedAt ?? null,
      };
    });

    return NextResponse.json({
      session: seance,
      rows,
      total: rows.length,
      marked: attendances.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/attendance/sheet/[sessionId]
 * Enregistre l'appel en lot pour une seance.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    if (!hasPermission(session.permissions, "learner-attendances", "update")) {
      throw new ApiError("Droits insuffisants.", 403);
    }

    const { sessionId } = await params;
    const body = await request.json();
    const entries: {
      learnerId: string;
      status: string;
      arrivalTime?: string | null;
      departureTime?: string | null;
      lateMinutes?: number | null;
      comment?: string | null;
    }[] = Array.isArray(body?.entries) ? body.entries : [];

    if (!entries.length) {
      throw new ApiError("Aucune ligne a enregistrer.", 422);
    }

    const seance = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, openedAt: true },
    });
    if (!seance) {
      return NextResponse.json({ error: "Seance introuvable." }, { status: 404 });
    }

    const now = new Date();
    const results = [];

    await prisma.$transaction(
      entries.map((entry) => {
        const status = VALID_STATUSES.includes(entry.status as never)
          ? entry.status
          : "PRESENT";
        const data = {
          status: status as (typeof VALID_STATUSES)[number],
          arrivalTime: entry.arrivalTime ?? null,
          departureTime: entry.departureTime ?? null,
          lateMinutes: entry.lateMinutes ?? 0,
          comment: entry.comment ?? null,
          markedBy: session.userId,
          markedAt: now,
        };
        return prisma.learnerAttendance.upsert({
          where: { sessionId_learnerId: { sessionId, learnerId: entry.learnerId } },
          create: { sessionId, learnerId: entry.learnerId, ...data },
          update: data,
        });
      }),
    );

    if (body?.close) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "CLOSED", closedAt: now },
      });
    } else if (seance.status === "PLANNED") {
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "OPEN", openedAt: seance.openedAt ?? now },
      });
    }

    const marked = await prisma.learnerAttendance.count({ where: { sessionId } });
    results.push(marked);

    return NextResponse.json({ ok: true, marked, closed: !!body?.close });
  } catch (error) {
    return errorResponse(error);
  }
}
