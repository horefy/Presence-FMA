"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Spinner,
} from "@/components/ui";
import { statusMeta } from "@/components/status";
import {
  columnInfo,
  displayValue,
  isStatusColumn,
  rawValue,
} from "@/lib/display";
import type { ResourceDef } from "@/lib/registry";
import { cn, formatNumber, getErrorMessage } from "@/lib/utils";

export interface ListPermissions {
  create: boolean;
  update: boolean;
  delete: boolean;
}

const PAGE_SIZE = 20;

export function ResourceList({
  resource,
  permissions,
}: {
  resource: ResourceDef;
  permissions: ListPermissions;
}) {
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageCount, setPageCount] = React.useState(1);
  const [q, setQ] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<string | undefined>(
    resource.defaultSort?.field,
  );
  const [dir, setDir] = React.useState<"asc" | "desc">(
    resource.defaultSort?.dir ?? "desc",
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<Record<string, unknown> | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);

  const columns = React.useMemo(
    () => resource.listFields.map((c) => columnInfo(resource, c)),
    [resource],
  );

  /* Recherche differee */
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (search) params.set("q", search);
      if (sort) {
        params.set("sort", sort);
        params.set("dir", dir);
      }
      const res = await fetch(`/api/${resource.key}?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Impossible de charger les donnees.");
        setRows([]);
        return;
      }
      setError(null);
      setRows((data?.data ?? []) as Record<string, unknown>[]);
      setTotal(data?.total ?? 0);
      setPageCount(data?.pageCount ?? 1);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    // Aucun setState avant le premier await : l'etat initial « loading=true »
    // couvre le premier chargement (react-hooks/set-state-in-effect).
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.key, page, search, sort, dir]);

  function toggleSort(columnKey: string) {
    if (sort === columnKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(columnKey);
      setDir("asc");
    }
    setPage(1);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/${resource.key}/${toDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "La suppression a echoue.");
        setDeleting(false);
        setToDelete(null);
        return;
      }
      setToDelete(null);
      setDeleting(false);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
      setDeleting(false);
      setToDelete(null);
    }
  }

  const showActions = permissions.update || permissions.delete;

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Rechercher..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500">
          {formatNumber(total)} enregistrement{total > 1 ? "s" : ""}
        </p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 transition-colors hover:text-slate-800"
                      >
                        {col.label}
                        {sort === col.key ? (
                          dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                {showActions ? (
                  <th className="w-20 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    className="px-4 py-12"
                  >
                    <div className="flex justify-center">
                      <Spinner />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    className="px-4 py-4"
                  >
                    <EmptyState
                      title="Aucun enregistrement"
                      description={
                        search
                          ? `Aucun resultat pour « ${search} ».`
                          : "Cette liste est vide pour le moment."
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={String(row.id)}
                    className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/80"
                  >
                    {columns.map((col) => {
                      const value = displayValue(resource, col.key, row);
                      return (
                        <td
                          key={col.key}
                          className="whitespace-nowrap px-4 py-2.5 text-slate-700"
                        >
                          {isStatusColumn(col) && rawValue(resource, col.key, row) ? (
                            <Badge tone={statusMeta(rawValue(resource, col.key, row)).tone}>
                              {value}
                            </Badge>
                          ) : (
                            value
                          )}
                        </td>
                      );
                    })}
                    {showActions ? (
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/${resource.key}/${row.id}`}
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                            title={
                              permissions.update
                                ? "Consulter / modifier"
                                : "Consulter"
                            }
                          >
                            {permissions.update ? (
                              <Pencil className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Link>
                          {permissions.delete ? (
                            <button
                              type="button"
                              onClick={() => setToDelete(row)}
                              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5">
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
                Precedent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Confirmation de suppression */}
      <Modal
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        title="Confirmer la suppression"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Voulez-vous vraiment supprimer cet enregistrement ? Cette action est
          irreversible. Les enregistrements lies qui bloquent la suppression
          genereront un message d&apos;erreur explicite.
        </p>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Petits utilitaires de style                         */
/* -------------------------------------------------------------------------- */

export function TableCellValue({
  resource,
  column,
  row,
  className,
}: {
  resource: ResourceDef;
  column: string;
  row: Record<string, unknown>;
  className?: string;
}) {
  return (
    <span className={cn("truncate", className)}>
      {displayValue(resource, column, row)}
    </span>
  );
}
