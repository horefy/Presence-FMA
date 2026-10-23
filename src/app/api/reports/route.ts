import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { ApiError } from "@/lib/crud";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const DAY = 24 * 3600 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

function countBy<T extends string>(rows: { status: T }[]) {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.status] = (map[r.status] ?? 0) + 1;
  return map;
}

function rate(present: number, total: number) {
  return total ? Math.round((present / total) * 100) : 0;
}

/* -------------------------------------------------------------------------- */
/*                                    GET                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/reports?scope=overview|classes|learners|staff&from=&to=&classGroupId=
 *
 * - overview : indicateurs globaux + serie journaliere + repartition des statuts
 * - classes  : taux de presence par classe
 * - learners : taux de presence par apprenant (les plus absences en tete)
 * - staff    : taux de presence par membre du personnel
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasPermission(session.permissions, "learner-attendances", "read")) {
      throw new ApiError("Droits insuffisants.", 403);
    }

    const sp = request.nextUrl.searchParams;
    const scope = sp.get("scope") ?? "overview";
    const today = new Date();

    const from = startOfDay(
      parseDate(sp.get("from"), new Date(today.getTime() - 29 * DAY)),
    );
    const to = endOfDay(parseDate(sp.get("to"), today));
    const classGroupId = sp.get("classGroupId") || null;

    const scoped =
      !isSuperAdmin(session.permissions) && session.establishmentId
        ? session.establishmentId
        : null;

    /* ------------------------- Filtres de session ------------------------- */
    const sessionWhere: Record<string, unknown> = {
      sessionDate: { gte: from, lte: to },
    };
    if (scoped) sessionWhere.establishmentId = scoped;
    if (classGroupId) sessionWhere.classGroupId = classGroupId;

    /* --------------------------- Vue d'ensemble --------------------------- */
    if (scope === "overview") {
      const [learnerRows, staffRows, sessions, seriesRows] = await Promise.all([
        prisma.learnerAttendance.findMany({
          where: { session: sessionWhere },
          select: {
            status: true,
            lateMinutes: true,
            session: { select: { sessionDate: true } },
          },
        }),
        prisma.staffAttendance.findMany({
          where: {
            attendanceDate: { gte: from, lte: to },
            ...(scoped ? { establishmentId: scoped } : {}),
          },
          select: { status: true, lateMinutes: true },
        }),
        prisma.session.count({ where: sessionWhere }),
        prisma.learnerAttendance.findMany({
          where: { session: sessionWhere },
          select: {
            status: true,
            session: { select: { sessionDate: true } },
          },
        }),
      ]);

      const learnerCounts = countBy(learnerRows);
      const staffCounts = countBy(staffRows);

      const learnerTotal = learnerRows.length;
      const learnerPresent =
        (learnerCounts.PRESENT ?? 0) + (learnerCounts.LATE ?? 0);
      const staffTotal = staffRows.length;
      const staffPresent =
        (staffCounts.PRESENT ?? 0) +
        (staffCounts.LATE ?? 0) +
        (staffCounts.HALF_DAY ?? 0) +
        (staffCounts.REMOTE ?? 0);

      // Serie journaliere
      const buckets = new Map<string, { total: number; present: number }>();
      const days = Math.min(366, Math.round((to.getTime() - from.getTime()) / DAY) + 1);
      for (let i = 0; i < days; i++) {
        const d = new Date(from.getTime() + i * DAY);
        buckets.set(isoDay(d), { total: 0, present: 0 });
      }
      for (const row of seriesRows) {
        const key = isoDay(new Date(row.session.sessionDate));
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.total += 1;
        if (row.status === "PRESENT" || row.status === "LATE") bucket.present += 1;
      }
      const series = Array.from(buckets.entries()).map(([date, v]) => ({
        date,
        total: v.total,
        present: v.present,
        absent: v.total - v.present,
        rate: rate(v.present, v.total),
      }));

      const lateMinutesLearner = learnerRows.reduce(
        (a, r) => a + r.lateMinutes,
        0,
      );
      const lateMinutesStaff = staffRows.reduce((a, r) => a + r.lateMinutes, 0);

      return NextResponse.json({
        scope,
        period: { from: isoDay(from), to: isoDay(to) },
        learner: {
          total: learnerTotal,
          present: learnerPresent,
          absent: learnerCounts.ABSENT ?? 0,
          excused: learnerCounts.EXCUSED ?? 0,
          late: learnerCounts.LATE ?? 0,
          leftEarly: learnerCounts.LEFT_EARLY ?? 0,
          rate: rate(learnerPresent, learnerTotal),
          lateMinutes: lateMinutesLearner,
          byStatus: learnerCounts,
        },
        staff: {
          total: staffTotal,
          present: staffPresent,
          absent: staffCounts.ABSENT ?? 0,
          onLeave: staffCounts.ON_LEAVE ?? 0,
          late: staffCounts.LATE ?? 0,
          holiday: staffCounts.HOLIDAY ?? 0,
          rate: rate(staffPresent, staffTotal),
          lateMinutes: lateMinutesStaff,
          byStatus: staffCounts,
        },
        sessions,
        series,
      });
    }

    /* ------------------------- Statistiques par classe -------------------- */
    if (scope === "classes") {
      const classes = await prisma.classGroup.findMany({
        where: scoped ? { establishmentId: scoped } : {},
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      });

      const rows = await prisma.learnerAttendance.findMany({
        where: {
          session: classGroupId ? { ...sessionWhere, classGroupId } : sessionWhere,
        },
        select: { status: true, session: { select: { classGroupId: true } } },
      });

      const perClass = new Map<
        string,
        { total: number; present: number; absent: number; late: number; excused: number }
      >();
      for (const c of classes) {
        perClass.set(c.id, {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        });
      }

      let globalTotal = 0;
      let globalPresent = 0;

      for (const row of rows) {
        const bucket = perClass.get(row.session.classGroupId);
        if (!bucket) continue;
        bucket.total += 1;
        globalTotal += 1;
        if (row.status === "PRESENT") {
          bucket.present += 1;
          globalPresent += 1;
        } else if (row.status === "ABSENT") bucket.absent += 1;
        else if (row.status === "LATE") {
          bucket.late += 1;
          bucket.present += 1;
          globalPresent += 1;
        } else if (row.status === "EXCUSED") bucket.excused += 1;
      }

      return NextResponse.json({
        scope,
        period: { from: isoDay(from), to: isoDay(to) },
        global: {
          total: globalTotal,
          present: globalPresent,
          rate: rate(globalPresent, globalTotal),
        },
        classes: classes.map((c) => {
          const b = perClass.get(c.id)!;
          return {
            id: c.id,
            name: c.name,
            code: c.code,
            total: b.total,
            present: b.present,
            absent: b.absent,
            late: b.late,
            excused: b.excused,
            rate: rate(b.present, b.total),
          };
        }),
      });
    }

    /* ------------------------ Statistiques par apprenant ------------------- */
    if (scope === "learners") {
      const rows = await prisma.learnerAttendance.groupBy({
        by: ["learnerId", "status"],
        where: { session: sessionWhere },
        _count: { _all: true },
      });

      const learnerMap = new Map<
        string,
        { total: number; present: number; absent: number; late: number; excused: number }
      >();
      for (const r of rows) {
        let b = learnerMap.get(r.learnerId);
        if (!b) {
          b = { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
          learnerMap.set(r.learnerId, b);
        }
        const n = r._count._all;
        b.total += n;
        if (r.status === "PRESENT") b.present += n;
        else if (r.status === "ABSENT") b.absent += n;
        else if (r.status === "LATE") {
          b.late += n;
          b.present += n;
        } else if (r.status === "EXCUSED") b.excused += n;
      }

      const learners = await prisma.learner.findMany({
        where: {
          ...(scoped ? { establishmentId: scoped } : {}),
          id: { in: Array.from(learnerMap.keys()) },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          registrationNumber: true,
          enrollments: {
            where: { status: "ACTIVE" },
            select: { classGroup: { select: { name: true } } },
            take: 1,
          },
        },
      });

      const limit = Math.min(200, Number(sp.get("limit") ?? 50) || 50);
      const data = learners
        .map((l) => {
          const b = learnerMap.get(l.id)!;
          return {
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            matricule: l.registrationNumber,
            className: l.enrollments[0]?.classGroup.name ?? "—",
            total: b.total,
            present: b.present,
            absent: b.absent,
            late: b.late,
            excused: b.excused,
            rate: rate(b.present, b.total),
          };
        })
        .sort((a, b) => b.absent - a.absent || b.total - a.total)
        .slice(0, limit);

      return NextResponse.json({
        scope,
        period: { from: isoDay(from), to: isoDay(to) },
        data,
      });
    }

    /* ---------------------- Statistiques par personnel --------------------- */
    if (scope === "staff") {
      const rows = await prisma.staffAttendance.groupBy({
        by: ["staffId", "status"],
        where: {
          attendanceDate: { gte: from, lte: to },
          ...(scoped ? { establishmentId: scoped } : {}),
        },
        _count: { _all: true },
      });

      const staffMap = new Map<
        string,
        { total: number; present: number; absent: number; late: number; onLeave: number }
      >();
      for (const r of rows) {
        let b = staffMap.get(r.staffId);
        if (!b) {
          b = { total: 0, present: 0, absent: 0, late: 0, onLeave: 0 };
          staffMap.set(r.staffId, b);
        }
        const n = r._count._all;
        b.total += n;
        if (r.status === "PRESENT") b.present += n;
        else if (r.status === "ABSENT") b.absent += n;
        else if (r.status === "LATE") {
          b.late += n;
          b.present += n;
        } else if (r.status === "ON_LEAVE") b.onLeave += n;
      }

      const staff = await prisma.staff.findMany({
        where: {
          ...(scoped ? { establishmentId: scoped } : {}),
          id: { in: Array.from(staffMap.keys()) },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          assignments: {
            where: { isPrimary: true },
            select: { department: { select: { name: true } } },
            take: 1,
          },
        },
      });

      const limit = Math.min(200, Number(sp.get("limit") ?? 50) || 50);
      const data = staff
        .map((s) => {
          const b = staffMap.get(s.id)!;
          return {
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            matricule: s.employeeNumber,
            department: s.assignments[0]?.department?.name ?? "—",
            total: b.total,
            present: b.present,
            absent: b.absent,
            late: b.late,
            onLeave: b.onLeave,
            rate: rate(b.present, b.total),
          };
        })
        .sort((a, b) => b.absent - a.absent || b.total - a.total)
        .slice(0, limit);

      return NextResponse.json({
        scope,
        period: { from: isoDay(from), to: isoDay(to) },
        data,
      });
    }

    throw new ApiError("Type de rapport inconnu.", 400);
  } catch (error) {
    return errorResponse(error);
  }
}
