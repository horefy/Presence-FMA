"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { statusMeta } from "@/components/status";
import { formatDate, formatNumber, getErrorMessage } from "@/lib/utils";

interface SessionRow {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  classGroup: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
  room: { id: string; name: string } | null;
  _count: { attendances: number };
}

const PAGE_SIZE = 15;

export function AppelsView() {
  const [rows, setRows] = React.useState<SessionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageCount, setPageCount] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [date, setDate] = React.useState("");
  const [classGroupId, setClassGroupId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [classes, setClasses] = React.useState<{ value: string; label: string }[]>([]);

  React.useEffect(() => {
    fetch("/api/meta/options?model=ClassGroup&labelFields=name&limit=200")
      .then((r) => r.json())
      .then((d) => setClasses(d.options ?? []))
      .catch(() => setClasses([]));
  }, []);

  async function load() {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      params.set("sort", "sessionDate");
      params.set("dir", "desc");
      if (date) params.set("sessionDate", date);
      if (classGroupId) params.set("classGroupId", classGroupId);
      if (status) params.set("status", status);
      const res = await fetch(`/api/sessions?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Impossible de charger les seances.");
        return;
      }
      setRows((data?.data ?? []) as SessionRow[]);
      setTotal(data?.total ?? 0);
      setPageCount(data?.pageCount ?? 1);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, date, classGroupId, status]);

  function applyFilters(next: Partial<{ date: string; classGroupId: string; status: string }>) {
    setDate(next.date ?? date);
    setClassGroupId(next.classGroupId ?? classGroupId);
    setStatus(next.status ?? status);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => applyFilters({ date: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Classe
            </label>
            <Select
              value={classGroupId}
              onChange={(e) => applyFilters({ classGroupId: e.target.value })}
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
              Statut
            </label>
            <Select
              value={status}
              onChange={(e) => applyFilters({ status: e.target.value })}
            >
              <option value="">Tous les statuts</option>
              <option value="PLANNED">Planifiee</option>
              <option value="OPEN">Ouverte</option>
              <option value="CLOSED">Cloturee</option>
              <option value="CANCELLED">Annulee</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => applyFilters({ date: "", classGroupId: "", status: "" })}
            >
              <Search className="h-4 w-4" />
              Reinitialiser
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <p className="text-sm text-slate-600">
            {formatNumber(total)} seance(s) trouvee(s)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2.5">Date</th>
                <th className="px-5 py-2.5">Horaire</th>
                <th className="px-5 py-2.5">Classe</th>
                <th className="px-5 py-2.5">Matiere</th>
                <th className="px-5 py-2.5">Enseignant</th>
                <th className="px-5 py-2.5">Salle</th>
                <th className="px-5 py-2.5">Appel</th>
                <th className="px-5 py-2.5">Statut</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12">
                    <div className="flex justify-center">
                      <Spinner />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-4">
                    <EmptyState
                      title="Aucune seance"
                      description="Aucune seance ne correspond aux criteres selectionnes."
                      icon={<CalendarDays className="h-8 w-8" />}
                    />
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                      {formatDate(s.sessionDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                      {s.startTime} - {s.endTime}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                      {s.classGroup?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                      {s.subject?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                      {s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                      {s.room?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">
                      {s._count?.attendances ?? 0}
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
                        Faire l&apos;appel
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-2.5">
            <p className="text-xs text-slate-500">
              Page {page} sur {pageCount}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
