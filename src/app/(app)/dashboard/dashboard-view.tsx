"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarCheck2,
  ClipboardCheck,
  FileCheck,
  GraduationCap,
  School,
  Users,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  LoadingBlock,
} from "@/components/ui";
import { statusMeta } from "@/components/status";
import { formatDate, formatNumber } from "@/lib/utils";

interface DashboardData {
  kpis: {
    establishments: number;
    staff: number;
    learners: number;
    activeLearners: number;
    classGroups: number;
    sessionsToday: number;
    openSessions: number;
    pendingLeaves: number;
    pendingCorrections: number;
    pendingJustifications: number;
    unreadNotifications: number;
    holidays: number;
    terms: number;
  };
  learnerAttendanceToday: Record<string, number>;
  staffAttendanceToday: Record<string, number>;
  attendanceRate30d: number;
  series: { date: string; total: number; present: number; rate: number }[];
  classStats: {
    id: string;
    name: string;
    students: number;
    total: number;
    absent: number;
    rate: number;
  }[];
  todaySessions: {
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    status: string;
    classGroup: { name: string };
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
    room: { name: string } | null;
    _count: { attendances: number };
  }[];
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "indigo",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  tone?: "indigo" | "green" | "amber" | "red" | "blue" | "slate";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-sky-50 text-sky-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

const LEARNER_STATUS_ORDER = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
  "LEFT_EARLY",
];

export function DashboardView() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard")
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(json?.error ?? "Erreur de chargement");
        if (!cancelled) setData(json as DashboardData);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <LoadingBlock label="Chargement du tableau de bord..." />;

  const k = data.kpis;
  const pendingTotal =
    k.pendingLeaves + k.pendingCorrections + k.pendingJustifications;

  const learnerTodayData = LEARNER_STATUS_ORDER.map((status) => ({
    name: statusMeta(status).label,
    status,
    value: data.learnerAttendanceToday[status] ?? 0,
  }));

  const staffTodayData = Object.entries(data.staffAttendanceToday).map(
    ([status, value]) => ({
      name: statusMeta(status).label,
      status,
      value,
    }),
  );

  const seriesData = data.series.map((s) => ({
    ...s,
    label: formatDate(s.date).slice(0, 5),
  }));

  return (
    <div className="space-y-6">
      {/* Indicateurs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Personnel"
          value={formatNumber(k.staff)}
          hint={`${k.holidays} jour(s) ferie(s) sur l'annee`}
          icon={<Users className="h-4 w-4" />}
          tone="indigo"
        />
        <KpiCard
          label="Apprenants"
          value={formatNumber(k.learners)}
          hint={`${formatNumber(k.activeLearners)} actifs`}
          icon={<GraduationCap className="h-4 w-4" />}
          tone="blue"
        />
        <KpiCard
          label="Classes"
          value={formatNumber(k.classGroups)}
          hint={`${k.terms} trimestre(s) / ${k.establishments} etablissement(s)`}
          icon={<School className="h-4 w-4" />}
          tone="slate"
        />
        <KpiCard
          label="Taux de presence (30 j)"
          value={`${data.attendanceRate30d} %`}
          hint={`${k.sessionsToday} seance(s) aujourd'hui`}
          icon={<ClipboardCheck className="h-4 w-4" />}
          tone={data.attendanceRate30d >= 85 ? "green" : "amber"}
        />
      </div>

      {/* Demandes en attente */}
      {pendingTotal > 0 ? (
        <Alert tone="warning" title="Elements en attente de traitement">
          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            {k.pendingLeaves > 0 ? (
              <li>
                <Link
                  href="/staff-leaves?status=PENDING"
                  className="underline underline-offset-2 hover:text-amber-900"
                >
                  {k.pendingLeaves} demande(s) de conge
                </Link>
              </li>
            ) : null}
            {k.pendingCorrections > 0 ? (
              <li>
                <Link
                  href="/attendance-corrections?status=PENDING"
                  className="underline underline-offset-2 hover:text-amber-900"
                >
                  {k.pendingCorrections} correction(s) de presence
                </Link>
              </li>
            ) : null}
            {k.pendingJustifications > 0 ? (
              <li>
                <Link
                  href="/absence-justifications?status=PENDING"
                  className="underline underline-offset-2 hover:text-amber-900"
                >
                  {k.pendingJustifications} justificatif(s) d&apos;absence
                </Link>
              </li>
            ) : null}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Courbe */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Taux de presence des apprenants"
            description="30 derniers jours (presents + retards / total)"
          />
          <CardBody>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval="preserveStartEnd"
                    minTickGap={18}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value) => [`${value} %`, "Taux de presence"]}
                    labelFormatter={(label) => `Jour ${label}`}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#rate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Repartition du jour */}
        <Card>
          <CardHeader
            title="Assiduite du jour"
            description="Repartition des statuts enregistres"
          />
          <CardBody className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Apprenants
              </p>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={learnerTodayData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={78}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(value) => [value, "Effectif"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {learnerTodayData.map((d) => (
                        <Cell
                          key={d.status}
                          fill={
                            d.status === "PRESENT"
                              ? "#10b981"
                              : d.status === "ABSENT"
                                ? "#ef4444"
                                : d.status === "LATE"
                                  ? "#f59e0b"
                                  : "#6366f1"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Personnel
              </p>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffTodayData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={78}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(value) => [value, "Effectif"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {staffTodayData.map((d) => (
                        <Cell
                          key={d.status}
                          fill={
                            d.status === "PRESENT"
                              ? "#10b981"
                              : d.status === "ABSENT"
                                ? "#ef4444"
                                : d.status === "LATE"
                                  ? "#f59e0b"
                                  : "#6366f1"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Seances du jour + classes */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Seances du jour"
            description="Cliquez sur « Faire l'appel » pour saisir les presences"
            action={
              <Button variant="outline" size="sm" href="/appels">
                Toutes les seances
              </Button>
            }
          />
          <CardBody className="p-0">
            {data.todaySessions.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Aucune seance planifiee aujourd&apos;hui.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Horaire</th>
                      <th className="px-5 py-2.5">Classe</th>
                      <th className="px-5 py-2.5">Matiere</th>
                      <th className="px-5 py-2.5">Enseignant</th>
                      <th className="px-5 py-2.5">Statut</th>
                      <th className="px-5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.todaySessions.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                          {s.startTime} - {s.endTime}
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                          {s.classGroup?.name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                          {s.subject?.name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                          {s.teacher?.firstName} {s.teacher?.lastName}
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5">
                          <Badge tone={statusMeta(s.status).tone}>
                            {statusMeta(s.status).label}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-right">
                          <Link
                            href={`/appels/${s.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                          >
                            <CalendarCheck2 className="h-3.5 w-3.5" />
                            Faire l&apos;appel
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Taux d'absence par classe"
            description="Classement des classes les plus absenteistes"
          />
          <CardBody className="space-y-3">
            {data.classStats.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Aucune donnee de presence.
              </p>
            ) : (
              data.classStats.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm">
                    <Link
                      href={`/class-groups/${c.id}`}
                      className="font-medium text-slate-700 hover:text-indigo-600"
                    >
                      {c.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {c.students} eleves · {c.rate} %
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        c.rate >= 20
                          ? "bg-red-500"
                          : c.rate >= 10
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, c.rate * 3)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Raccourcis */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/appels" className="group">
          <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-indigo-300">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">Feuilles d&apos;appel</p>
              <p className="text-xs text-slate-500">Saisir les presences</p>
            </div>
          </Card>
        </Link>
        <Link href="/emploi-du-temps" className="group">
          <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-indigo-300">
            <CalendarCheck2 className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">Emploi du temps</p>
              <p className="text-xs text-slate-500">Planning hebdomadaire</p>
            </div>
          </Card>
        </Link>
        <Link href="/rapports" className="group">
          <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-indigo-300">
            <FileCheck className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">Rapports</p>
              <p className="text-xs text-slate-500">Statistiques d&apos;assiduite</p>
            </div>
          </Card>
        </Link>
        <Link href="/notifications" className="group">
          <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-indigo-300">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">Notifications</p>
              <p className="text-xs text-slate-500">
                {k.unreadNotifications} non lue(s)
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
