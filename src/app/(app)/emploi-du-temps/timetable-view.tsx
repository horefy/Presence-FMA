"use client";

import * as React from "react";
import { CalendarRange, Printer } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LoadingBlock,
  Select,
} from "@/components/ui";

interface Entry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { id: string; name: string; code: string } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
  room: { id: string; name: string } | null;
  classGroup: { id: string; name: string; code: string } | null;
}

const DAYS = [
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
  { value: 7, label: "Dimanche", short: "Dim" },
];

export function TimetableView() {
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [classes, setClasses] = React.useState<{ value: string; label: string }[]>([]);
  const [teachers, setTeachers] = React.useState<{ value: string; label: string }[]>([]);
  const [classGroupId, setClassGroupId] = React.useState("");
  const [teacherId, setTeacherId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/meta/options?model=ClassGroup&labelFields=name&limit=200").then(
        (r) => r.json(),
      ),
      fetch("/api/meta/options?model=Staff&labelFields=firstName,lastName&limit=200").then(
        (r) => r.json(),
      ),
    ])
      .then(([c, t]) => {
        setClasses(c.options ?? []);
        setTeachers(t.options ?? []);
      })
      .catch(() => {
        setClasses([]);
        setTeachers([]);
      });
  }, []);

  async function load() {
    if (!classGroupId && !teacherId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (classGroupId) params.set("classGroupId", classGroupId);
      if (teacherId) params.set("teacherId", teacherId);
      const res = await fetch(`/api/timetable?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Impossible de charger l'emploi du temps.");
        return;
      }
      setEntries((data?.entries ?? []) as Entry[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classGroupId, teacherId]);

  const byDay = React.useMemo(() => {
    const map = new Map<number, Entry[]>();
    for (const d of DAYS) map.set(d.value, []);
    for (const e of entries) {
      const list = map.get(e.dayOfWeek) ?? [];
      list.push(e);
      map.set(e.dayOfWeek, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [entries]);

  const slots = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(`${e.startTime}|${e.endTime}`);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Classe
            </label>
            <Select
              value={classGroupId}
              onChange={(e) => {
                setClassGroupId(e.target.value);
                if (e.target.value) setTeacherId("");
              }}
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
              Enseignant
            </label>
            <Select
              value={teacherId}
              onChange={(e) => {
                setTeacherId(e.target.value);
                if (e.target.value) setClassGroupId("");
              }}
            >
              <option value="">Tous les enseignants</option>
              {teachers.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full no-print" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <LoadingBlock label="Chargement de l'emploi du temps..." />
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucun creneau"
            description={
              classGroupId || teacherId
                ? "Aucune seance planifiee pour cette selection."
                : "Selectionnez une classe ou un enseignant pour afficher l'emploi du temps."
            }
            icon={<CalendarRange className="h-8 w-8" />}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader
            title="Planning hebdomadaire"
            description={`${entries.length} seance(s) planifiee(s)`}
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="w-28 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Horaire
                    </th>
                    {DAYS.map((d) => (
                      <th
                        key={d.value}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => {
                    const [start, end] = slot.split("|");
                    return (
                      <tr key={slot} className="border-b border-slate-100 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 align-top text-xs font-medium text-slate-500">
                          {start}
                          <br />
                          {end}
                        </td>
                        {DAYS.map((d) => {
                          const cell = (byDay.get(d.value) ?? []).filter(
                            (e) => e.startTime === start && e.endTime === end,
                          );
                          return (
                            <td key={d.value} className="px-2 py-2 align-top">
                              <div className="space-y-1.5">
                                {cell.map((e) => (
                                  <div
                                    key={e.id}
                                    className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-2.5 py-2"
                                  >
                                    <p className="text-xs font-semibold text-indigo-900">
                                      {e.subject?.name ?? "—"}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-indigo-700">
                                      {e.teacher
                                        ? `${e.teacher.firstName} ${e.teacher.lastName}`
                                        : "—"}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                      {e.room?.name ?? "Sans salle"}
                                      {e.classGroup ? ` · ${e.classGroup.name}` : ""}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
