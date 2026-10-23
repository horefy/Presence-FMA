import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { isSuperAdmin } from "@/lib/permissions";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** GET /api/dashboard : indicateurs cles et series pour le tableau de bord. */
export async function GET() {
  try {
    const session = await requireSession();
    const scoped =
      !isSuperAdmin(session.permissions) && session.establishmentId
        ? session.establishmentId
        : null;

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const last30 = startOfDay(new Date(today.getTime() - 30 * 24 * 3600 * 1000));

    const learnerWhere = scoped ? { establishmentId: scoped } : {};
    const staffWhere = scoped ? { establishmentId: scoped } : {};
    const sessionWhere = scoped ? { establishmentId: scoped } : {};

    const [
      establishments,
      staffCount,
      learnerCount,
      classCount,
      activeLearners,
      sessionsToday,
      openSessions,
      learnerAttendanceToday,
      staffAttendanceToday,
      pendingLeaves,
      pendingCorrections,
      pendingJustifications,
      unreadNotifications,
      learnerAttendanceRange,
      holidayCount,
      termCount,
    ] = await Promise.all([
      prisma.establishment.count(),
      prisma.staff.count({ where: staffWhere }),
      prisma.learner.count({ where: learnerWhere }),
      prisma.classGroup.count({ where: scoped ? { establishmentId: scoped } : {} }),
      prisma.learner.count({ where: { ...learnerWhere, status: "ACTIVE" } }),
      prisma.session.count({
        where: { ...sessionWhere, sessionDate: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.session.count({ where: { ...sessionWhere, status: "OPEN" } }),
      prisma.learnerAttendance.findMany({
        where: { session: { sessionDate: { gte: dayStart, lte: dayEnd } } },
        select: { status: true },
      }),
      prisma.staffAttendance.findMany({
        where: { ...staffWhere, attendanceDate: { gte: dayStart, lte: dayEnd } },
        select: { status: true },
      }),
      prisma.staffLeave.count({ where: { status: "PENDING" } }),
      prisma.attendanceCorrection.count({ where: { status: "PENDING" } }),
      prisma.absenceJustification.count({ where: { status: "PENDING" } }),
      prisma.notification.count({
        where: { userId: session.userId, readAt: null },
      }),
      prisma.learnerAttendance.findMany({
        where: {
          session: { sessionDate: { gte: last30, lte: dayEnd } },
          ...(scoped ? { session: { establishmentId: scoped, sessionDate: { gte: last30, lte: dayEnd } } } : {}),
        },
        select: { status: true, session: { select: { sessionDate: true } } },
      }),
      prisma.holiday.count({
        where: { ...(scoped ? { establishmentId: scoped } : {}) },
      }),
      prisma.term.count(),
    ]);

    const countBy = <T extends string>(rows: { status: T }[]) => {
      const map: Record<string, number> = {};
      for (const r of rows) map[r.status] = (map[r.status] ?? 0) + 1;
      return map;
    };

    const learnerToday = countBy(learnerAttendanceToday);
    const staffToday = countBy(staffAttendanceToday);

    // Serie journaliere sur 30 jours
    const seriesMap = new Map<string, { total: number; present: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(dayStart.getTime() - i * 24 * 3600 * 1000);
      seriesMap.set(isoDay(d), { total: 0, present: 0 });
    }
    for (const row of learnerAttendanceRange) {
      const key = isoDay(new Date(row.session.sessionDate));
      const bucket = seriesMap.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (row.status === "PRESENT" || row.status === "LATE") bucket.present += 1;
    }
    const series = Array.from(seriesMap.entries())
      .map(([date, v]) => ({
        date,
        total: v.total,
        present: v.present,
        rate: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }))
      .reverse();

    const last30Totals = series.reduce(
      (acc, s) => ({ total: acc.total + s.total, present: acc.present + s.present }),
      { total: 0, present: 0 },
    );

    // Top des classes par taux d'absence
    const classes = await prisma.classGroup.findMany({
      where: scoped ? { establishmentId: scoped } : {},
      select: {
        id: true,
        name: true,
        _count: { select: { enrollments: true } },
      },
      take: 6,
      orderBy: { name: "asc" },
    });

    const classStats = await Promise.all(
      classes.map(async (c) => {
        const rows = await prisma.learnerAttendance.groupBy({
          by: ["status"],
          where: {
            session: { classGroupId: c.id },
            ...(scoped ? { session: { classGroupId: c.id, establishmentId: scoped } } : {}),
          },
          _count: { _all: true },
        });
        const total = rows.reduce((a, r) => a + r._count._all, 0);
        const absent = rows
          .filter((r) => r.status === "ABSENT")
          .reduce((a, r) => a + r._count._all, 0);
        return {
          id: c.id,
          name: c.name,
          students: c._count.enrollments,
          total,
          absent,
          rate: total ? Math.round((absent / total) * 100) : 0,
        };
      }),
    );

    // Seances du jour
    const todaySessions = await prisma.session.findMany({
      where: { ...sessionWhere, sessionDate: { gte: dayStart, lte: dayEnd } },
      include: {
        classGroup: { select: { name: true } },
        subject: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        room: { select: { name: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { startTime: "asc" },
      take: 12,
    });

    return NextResponse.json({
      kpis: {
        establishments,
        staff: staffCount,
        learners: learnerCount,
        activeLearners,
        classGroups: classCount,
        sessionsToday,
        openSessions,
        pendingLeaves,
        pendingCorrections,
        pendingJustifications,
        unreadNotifications,
        holidays: holidayCount,
        terms: termCount,
      },
      learnerAttendanceToday: learnerToday,
      staffAttendanceToday: staffToday,
      attendanceRate30d: last30Totals.total
        ? Math.round((last30Totals.present / last30Totals.total) * 100)
        : 0,
      series,
      classStats,
      todaySessions,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
