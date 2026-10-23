"use client";

import * as React from "react";
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
  Download,
  GraduationCap,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  LoadingBlock,
  Select,
} from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type Scope = "overview" | "classes" | "learners" | "staff";

interface OverviewData {
  scope: "overview";
  period: { from: string; to: string };
  learner: {
    total: number;
    present: number;
    absent: number;
    excused: number;
    late: number;
    leftEarly: number;
    rate: number;
    lateMinutes: number;
    byStatus: Record<string, number>;
  };
  staff: {
    total: number;
    present: number;
    absent: number;
    onLeave: number;
    late: number;
    holiday: number;
    rate: number;
    lateMinutes: number;
    byStatus: Record<string, number>;
  };
  sessions: number;
  series: {
    date: string;
    total: number;
    present: number;
    absent: number;
    rate: number;
  }[];
}

interface ClassesData {
  scope: "classes";
  period: { from: string; to: string };
  global: { total: number; present: number; rate: number };
  classes: {
    id: string;
    name: string;
    code: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
  }[];
}

interface RowItem {
  id: string;
  name: string;
  matricule: string;
  className?: string;
  department?: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused?: number;
  onLeave?: number;
  rate: number;
}

interface LearnersData {
  scope: "learners";
  period: { from: string; to: string };
  data: RowItem[];
}

interface StaffData {
  scope: "staff";
  period: { from: string; to: string };
  data: RowItem[];
}

type ReportData = OverviewData | ClassesData | LearnersData | StaffData;

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return isoDay(d);
}

function defaultTo() {
  return isoDay(new Date());
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const v = String(cell ?? "");
          return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(";"),
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/*                                  Composant                                 */
/* -------------------------------------------------------------------------- */

const SCOPES: { key: Scope; label: string }[] = [
  { key: "overview", label: "Vue d&apos;ensemble" },
  { key: "classes", label: "Par classe" },
  { key: "learners", label: "Par apprenant" },
  { key: "staff", label: "Par personnel" },
];

function StatTile({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "slate" | "green" | "amber" | "red" | "indigo" | "blue";
}) {
  const tones = {
    slate: "bg-slate-400",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    indigo: "bg-indigo-500",
    blue: "bg-sky-500",
  };
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3.5">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${tones[tone]}`}
        aria-hidden
      />
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 90
      ? "bg-emerald-500"
      : rate >= 75
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600">{rate} %</span>
    </div>
  );
}

export function RapportsView() {
  const [scope, setScope] = React.useState<Scope>("overview");
  const [from, setFrom] = React.useState(defaultFrom);
  const [to, setTo] = React.useState(defaultTo);
  const [classGroupId, setClassGroupId] = React.useState("");
  const [classes, setClasses] = React.useState<{ value: string; label: string }[]>([]);
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/meta/options?model=ClassGroup&labelFields=name&limit=200")
      .then((r) => r.json())
      .then((d) => setClasses(d.options ?? []))
      .catch(() => setClasses([]));
  }, []);

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({ scope, from, to });
      if (classGroupId && (scope === "overview" || scope === "classes")) {
        params.set("classGroupId", classGroupId);
      }
      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Impossible de charger le rapport.");
        return;
      }
      setData(json as ReportData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [scope, from, to, classGroupId]);

  React.useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const stamp = `${from}_${to}`;
    if (data.scope === "classes") {
      downloadCsv(`rapport_classes_${stamp}.csv`, [
        ["Code", "Classe", "Total", "Presents", "Absents", "Retards", "Excuses", "Taux %"],
        ...data.classes.map((c) => [
          c.code,
          c.name,
          c.total,
          c.present,
          c.absent,
          c.late,
          c.excused,
          c.rate,
        ]),
      ]);
    } else if (data.scope === "learners") {
      downloadCsv(`rapport_apprenants_${stamp}.csv`, [
        ["Matricule", "Nom", "Classe", "Total", "Presents", "Absents", "Retards", "Taux %"],
        ...data.data.map((r) => [
          r.matricule,
          r.name,
          r.className ?? "",
          r.total,
          r.present,
          r.absent,
          r.late,
          r.rate,
        ]),
      ]);
    } else if (data.scope === "staff") {
      downloadCsv(`rapport_personnel_${stamp}.csv`, [
        ["Matricule", "Nom", "Departement", "Total", "Presents", "Absents", "Retards", "Taux %"],
        ...data.data.map((r) => [
          r.matricule,
          r.name,
          r.department ?? "",
          r.total,
          r.present,
          r.absent,
          r.late,
          r.rate,
        ]),
      ]);
    } else {
      downloadCsv(`rapport_synthese_${stamp}.csv`, [
        ["Date", "Total", "Presents", "Absents", "Taux %"],
        ...data.series.map((s) => [
          s.date,
          s.total,
          s.present,
          s.absent,
          s.rate,
        ]),
      ]);
    }
  };

  /* ------------------------------ Rendu ------------------------------ */

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Du
            </label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Au
            </label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Classe
            </label>
            <Select
              value={classGroupId}
              onChange={(e) => setClassGroupId(e.target.value)}
              disabled={scope === "learners" || scope === "staff"}
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Rapport
            </label>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              {SCOPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              variant="secondary"
              onClick={exportCsv}
              disabled={!data}
              aria-label="Exporter en CSV"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </Card>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading && !data ? (
        <LoadingBlock label="Calcul des statistiques..." />
      ) : !data ? null : data.scope === "overview" ? (
        <OverviewReport data={data} />
      ) : data.scope === "classes" ? (
        <ClassesReport data={data} />
      ) : (
        <RowsReport data={data} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Vue d'ensemble                                */
/* -------------------------------------------------------------------------- */

function OverviewReport({ data }: { data: OverviewData }) {
  const series = data.series.map((s) => ({
    ...s,
    label: formatDate(s.date).slice(0, 5),
  }));

  const learnerStatuses = [
    { key: "PRESENT", label: "Present", color: "#10b981" },
    { key: "LATE", label: "En retard", color: "#f59e0b" },
    { key: "ABSENT", label: "Absent", color: "#ef4444" },
    { key: "EXCUSED", label: "Excuse", color: "#6366f1" },
    { key: "LEFT_EARLY", label: "Parti tot", color: "#94a3b8" },
  ]
    .map((s) => ({
      ...s,
      value: data.learner.byStatus[s.key] ?? 0,
    }))
    .filter((s) => s.value > 0);

  const staffStatuses = [
    { key: "PRESENT", label: "Present", color: "#10b981" },
    { key: "LATE", label: "En retard", color: "#f59e0b" },
    { key: "ABSENT", label: "Absent", color: "#ef4444" },
    { key: "ON_LEAVE", label: "En conge", color: "#6366f1" },
    { key: "HALF_DAY", label: "Demi-journee", color: "#0ea5e9" },
    { key: "REMOTE", label: "Teletravail", color: "#8b5cf6" },
    { key: "HOLIDAY", label: "Jour ferie", color: "#94a3b8" },
  ]
    .map((s) => ({
      ...s,
      value: data.staff.byStatus[s.key] ?? 0,
    }))
    .filter((s) => s.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Taux de presence (apprenants)"
          value={`${data.learner.rate} %`}
          hint={`${formatNumber(data.learner.present)} / ${formatNumber(data.learner.total)}`}
          tone={data.learner.rate >= 85 ? "green" : "amber"}
        />
        <StatTile
          label="Taux de presence (personnel)"
          value={`${data.staff.rate} %`}
          hint={`${formatNumber(data.staff.present)} / ${formatNumber(data.staff.total)}`}
          tone={data.staff.rate >= 85 ? "green" : "amber"}
        />
        <StatTile
          label="Absences (apprenants)"
          value={formatNumber(data.learner.absent)}
          hint={`${formatNumber(data.learner.excused)} excuse(s)`}
          tone="red"
        />
        <StatTile
          label="Seances sur la periode"
          value={formatNumber(data.sessions)}
          hint={`${formatNumber(data.learner.late)} retard(s) · ${formatNumber(data.staff.absent)} absence(s) personnel`}
          tone="indigo"
        />
      </div>

      <Card>
        <CardHeader
          title="Evolution du taux de presence"
          description={`Du ${formatDate(data.period.from)} au ${formatDate(data.period.to)}`}
        />
        <CardBody>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rapportRate" x1="0" y1="0" x2="0" y2="1">
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
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#rapportRate)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Repartition des statuts (apprenants)"
            description={`${formatNumber(data.learner.total)} enregistrement(s)`}
          />
          <CardBody>
            {learnerStatuses.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Aucune donnee sur la periode.
              </p>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={learnerStatuses} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={92}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(value) => [value, "Effectif"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {learnerStatuses.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Repartition des statuts (personnel)"
            description={`${formatNumber(data.staff.total)} enregistrement(s)`}
          />
          <CardBody>
            {staffStatuses.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Aucune donnee sur la periode.
              </p>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffStatuses} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={92}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(value) => [value, "Effectif"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {staffStatuses.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Rapport classes                               */
/* -------------------------------------------------------------------------- */

function ClassesReport({ data }: { data: ClassesData }) {
  return (
    <Card>
      <CardHeader
        title="Assiduite par classe"
        description={`Taux global : ${data.global.rate} % sur ${formatNumber(data.global.total)} marquage(s)`}
      />
      <CardBody className="p-0">
        {data.classes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Aucune donnee de presence sur la periode selectionnee.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Code</th>
                  <th className="px-5 py-2.5">Classe</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                  <th className="px-5 py-2.5 text-right">Presents</th>
                  <th className="px-5 py-2.5 text-right">Absents</th>
                  <th className="px-5 py-2.5 text-right">Retards</th>
                  <th className="px-5 py-2.5 text-right">Excuses</th>
                  <th className="px-5 py-2.5">Taux de presence</th>
                </tr>
              </thead>
              <tbody>
                {data.classes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{c.code}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                        <School className="h-3.5 w-3.5 text-slate-400" />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-600">{formatNumber(c.total)}</td>
                    <td className="px-5 py-2.5 text-right text-emerald-600">{formatNumber(c.present)}</td>
                    <td className="px-5 py-2.5 text-right text-red-600">{formatNumber(c.absent)}</td>
                    <td className="px-5 py-2.5 text-right text-amber-600">{formatNumber(c.late)}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600">{formatNumber(c.excused)}</td>
                    <td className="px-5 py-2.5">
                      <RateBar rate={c.rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Rapport lignes (pers.)                           */
/* -------------------------------------------------------------------------- */

function RowsReport({ data }: { data: LearnersData | StaffData }) {
  const isLearners = data.scope === "learners";
  return (
    <Card>
      <CardHeader
        title={isLearners ? "Assiduite par apprenant" : "Assiduite du personnel"}
        description={`${data.data.length} personne(s) · triees par nombre d'absences`}
      />
      <CardBody className="p-0">
        {data.data.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Aucune donnee sur la periode selectionnee.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Matricule</th>
                  <th className="px-5 py-2.5">Nom</th>
                  <th className="px-5 py-2.5">
                    {isLearners ? "Classe" : "Departement"}
                  </th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                  <th className="px-5 py-2.5 text-right">Presents</th>
                  <th className="px-5 py-2.5 text-right">Absents</th>
                  <th className="px-5 py-2.5 text-right">Retards</th>
                  <th className="px-5 py-2.5">Taux de presence</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-500">
                      {r.matricule}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                        {isLearners ? (
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {r.name}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">
                      {r.className ?? r.department ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-600">
                      {formatNumber(r.total)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-emerald-600">
                      {formatNumber(r.present)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-red-600">
                      {formatNumber(r.absent)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-amber-600">
                      {formatNumber(r.late)}
                    </td>
                    <td className="px-5 py-2.5">
                      <RateBar rate={r.rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
