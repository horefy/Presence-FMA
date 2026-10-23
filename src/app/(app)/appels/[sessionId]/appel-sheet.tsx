"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCheck,
  ClipboardCheck,
  Save,
  TriangleAlert,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { statusMeta } from "@/components/status";
import {
  formatDate,
  formatNumber,
  getErrorMessage,
  initials,
} from "@/lib/utils";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED"
  | "LEFT_EARLY";

interface SessionInfo {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  classGroup: { id: string; name: string; code: string | null } | null;
  subject: { id: string; name: string } | null;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string | null;
  } | null;
  room: { id: string; name: string } | null;
}

interface SheetRow {
  learnerId: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  photoUrl: string | null;
  attendanceId: string | null;
  status: string;
  arrivalTime: string | null;
  departureTime: string | null;
  lateMinutes: number;
  comment: string | null;
}

interface SheetResponse {
  session: SessionInfo;
  rows: SheetRow[];
  total: number;
  marked: number;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "En retard" },
  { value: "EXCUSED", label: "Excuse" },
  { value: "LEFT_EARLY", label: "Parti tot" },
];

/** Libelle court affiche dans les compteurs. */
const STATUS_TONE: Record<AttendanceStatus, "green" | "red" | "amber" | "blue"> =
  {
    PRESENT: "green",
    ABSENT: "red",
    LATE: "amber",
    EXCUSED: "blue",
    LEFT_EARLY: "amber",
  };

export function AppelSheetView({ sessionId }: { sessionId: string }) {
  const [sheet, setSheet] = React.useState<SheetResponse | null>(null);
  const [rows, setRows] = React.useState<SheetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/attendance/sheet/${sessionId}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (active) {
            setError(data?.error ?? "Impossible de charger la feuille d'appel.");
          }
          return;
        }
        if (!active) return;
        setSheet(data as SheetResponse);
        setRows((data?.rows ?? []) as SheetRow[]);
        setError(null);
      } catch (e) {
        if (active) setError(getErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const stats = React.useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      LEFT_EARLY: 0,
    };
    for (const row of rows) {
      const key = (
        STATUS_OPTIONS.some((o) => o.value === row.status)
          ? row.status
          : "PRESENT"
      ) as AttendanceStatus;
      counts[key] += 1;
    }
    return counts;
  }, [rows]);

  function updateRow(
    learnerId: string,
    patch: Partial<SheetRow>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.learnerId === learnerId ? { ...row, ...patch } : row,
      ),
    );
  }

  function setAll(status: AttendanceStatus) {
    setRows((current) => current.map((row) => ({ ...row, status })));
  }

  function handleStatusChange(learnerId: string, status: AttendanceStatus) {
    if (status === "LATE") {
      updateRow(learnerId, { status, lateMinutes: 10 });
    } else {
      updateRow(learnerId, { status, lateMinutes: 0 });
    }
  }

  async function save(close: boolean) {
    if (!rows.length) return;
    if (close) {
      setClosing(true);
    } else {
      setSaving(true);
    }
    setError(null);
    setSuccess(null);
    try {
      const entries = rows.map((row) => ({
        learnerId: row.learnerId,
        status: row.status,
        arrivalTime: row.arrivalTime || null,
        departureTime: row.departureTime || null,
        lateMinutes:
          row.status === "LATE" ? Number(row.lateMinutes ?? 0) : 0,
        comment: row.comment?.trim() ? row.comment.trim() : null,
      }));

      const res = await fetch(`/api/attendance/sheet/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, close }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Enregistrement impossible.");
        return;
      }

      setSuccess(
        close
          ? `Appel enregistre et seance cloturee (${data?.marked ?? entries.length} ligne(s)).`
          : `Appel enregistre (${data?.marked ?? entries.length} ligne(s)).`,
      );
      if (close && sheet) {
        setSheet({ ...sheet, session: { ...sheet.session, status: "CLOSED" } });
      } else if (sheet && sheet.session.status === "PLANNED") {
        setSheet({ ...sheet, session: { ...sheet.session, status: "OPEN" } });
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!sheet) {
    return (
      <Card>
        <EmptyState
          title="Feuille indisponible"
          description={error ?? "La seance demandee est introuvable."}
          icon={<TriangleAlert className="h-8 w-8" />}
          action={
            <Button href="/appels" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Retour aux appels
            </Button>
          }
        />
      </Card>
    );
  }

  const { session } = sheet;
  const isClosed = session.status === "CLOSED";
  const teacherName = session.teacher
    ? `${session.teacher.firstName} ${session.teacher.lastName}`
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button href="/appels" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Retour aux appels
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAll("PRESENT")}
            disabled={isClosed || !rows.length}
          >
            <CheckCheck className="h-4 w-4" />
            Tout present
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAll("ABSENT")}
            disabled={isClosed || !rows.length}
          >
            <UserX className="h-4 w-4" />
            Tout absent
          </Button>
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      {isClosed ? (
        <Alert tone="info" title="Seance cloturee">
          Cette seance est cloturee : la feuille d&apos;appel est en lecture
          seule.
        </Alert>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                {session.classGroup?.name ?? "Classe non precisee"}
              </h2>
              <Badge tone={statusMeta(session.status).tone}>
                {statusMeta(session.status).label}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              {session.subject?.name ?? "Matiere non precisee"} ·{" "}
              {formatDate(session.sessionDate)} · {session.startTime} -{" "}
              {session.endTime}
            </p>
            <p className="text-xs text-slate-500">
              Enseignant : {teacherName}
              {session.room ? ` · Salle : ${session.room.name}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">
              <UserCheck className="h-3.5 w-3.5" />
              {formatNumber(stats.PRESENT)} present(s)
            </Badge>
            <Badge tone="red">
              <UserX className="h-3.5 w-3.5" />
              {formatNumber(stats.ABSENT)} absent(s)
            </Badge>
            <Badge tone="amber">
              {formatNumber(stats.LATE)} retard(s)
            </Badge>
            <Badge tone="blue">
              {formatNumber(stats.EXCUSED + stats.LEFT_EARLY)} autre(s)
            </Badge>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucun apprenant inscrit"
            description="Aucun apprenant actif n'est inscrit dans cette classe."
            icon={<ClipboardCheck className="h-8 w-8" />}
            action={
              <Button href="/appels" variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Retour aux appels
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Apprenant</th>
                  <th className="px-3 py-2.5">Matricule</th>
                  <th className="px-3 py-2.5">Statut</th>
                  <th className="px-3 py-2.5">Arrivee</th>
                  <th className="px-3 py-2.5">Depart</th>
                  <th className="px-3 py-2.5">Retard (min)</th>
                  <th className="px-5 py-2.5">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = (
                    STATUS_OPTIONS.some((o) => o.value === row.status)
                      ? row.status
                      : "PRESENT"
                  ) as AttendanceStatus;
                  return (
                    <tr
                      key={row.learnerId}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                            {initials(row.firstName, row.lastName)}
                          </span>
                          <span className="font-medium text-slate-800">
                            {row.lastName} {row.firstName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                        {row.registrationNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Select
                            value={status}
                            disabled={isClosed}
                            onChange={(e) =>
                              handleStatusChange(
                                row.learnerId,
                                e.target.value as AttendanceStatus,
                              )
                            }
                            className="h-9 w-[140px] py-1"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                          <Badge tone={STATUS_TONE[status]}>{statusMeta(status).label}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="time"
                          value={row.arrivalTime ?? ""}
                          disabled={isClosed}
                          onChange={(e) =>
                            updateRow(row.learnerId, {
                              arrivalTime: e.target.value || null,
                            })
                          }
                          className="h-9 w-[120px] py-1"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="time"
                          value={row.departureTime ?? ""}
                          disabled={isClosed}
                          onChange={(e) =>
                            updateRow(row.learnerId, {
                              departureTime: e.target.value || null,
                            })
                          }
                          className="h-9 w-[120px] py-1"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          min={0}
                          max={600}
                          value={status === "LATE" ? row.lateMinutes : 0}
                          disabled={isClosed || status !== "LATE"}
                          onChange={(e) =>
                            updateRow(row.learnerId, {
                              lateMinutes: Number(e.target.value) || 0,
                            })
                          }
                          className="h-9 w-[90px] py-1"
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <Input
                          type="text"
                          value={row.comment ?? ""}
                          disabled={isClosed}
                          placeholder="Observation..."
                          onChange={(e) =>
                            updateRow(row.learnerId, {
                              comment: e.target.value,
                            })
                          }
                          className="h-9 min-w-[180px] py-1"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              {formatNumber(rows.length)} apprenant(s) · {formatNumber(sheet.marked)}{" "}
              presence(s) deja enregistree(s)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => save(false)}
                loading={saving}
                disabled={isClosed || closing}
              >
                <Save className="h-4 w-4" />
                Enregistrer
              </Button>
              <Button
                onClick={() => save(true)}
                loading={closing}
                disabled={isClosed || saving}
              >
                <ClipboardCheck className="h-4 w-4" />
                Enregistrer et cloturer
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <p className="text-xs text-slate-400">
        Lien direct :{" "}
        <Link href={`/appels/${sessionId}`} className="underline">
          /appels/{sessionId}
        </Link>
      </p>
    </div>
  );
}
