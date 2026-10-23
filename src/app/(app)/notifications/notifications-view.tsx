"use client";

import * as React from "react";
import {
  Bell,
  CheckCheck,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface NotificationsPayload {
  data: NotificationRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  unread: number;
}

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  IN_APP: { label: "Application", icon: <Bell className="h-4 w-4" /> },
  EMAIL: { label: "E-mail", icon: <Mail className="h-4 w-4" /> },
  SMS: { label: "SMS", icon: <Smartphone className="h-4 w-4" /> },
};

const TYPE_LABELS: Record<string, string> = {
  ABSENCE: "Absence",
  LEAVE_REQUEST: "Demande de conge",
  LEAVE_RESPONSE: "Reponse de conge",
  ATTENDANCE_CORRECTION: "Correction de presence",
  JUSTIFICATION: "Justificatif d'absence",
  SESSION_OPENED: "Seance ouverte",
  SESSION_CLOSED: "Seance cloturee",
  ANNOUNCEMENT: "Annonce",
  SYSTEM: "Systeme",
};

export function NotificationsView() {
  const [payload, setPayload] = React.useState<NotificationsPayload | null>(null);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (targetPage = 1) => {
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: "15",
        });
        if (unreadOnly) params.set("unread", "true");
        if (q.trim()) params.set("q", q.trim());

        const res = await fetch(`/api/notifications?${params.toString()}`);
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setError(json?.error ?? "Impossible de charger les notifications.");
          return;
        }
        setPayload(json as NotificationsPayload);
        setPage((json as NotificationsPayload).page);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    },
    [unreadOnly, q],
  );

  React.useEffect(() => {
    (async () => {
      await load(1);
    })();
  }, [load]);

  const markRead = async (id: string, read: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Action impossible.");
      }
      await load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Action impossible.");
      }
      await load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Suppression impossible.");
      }
      await load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  const rows = payload?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Rechercher une notification..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 shadow-sm focus:ring-2 focus:ring-indigo-500"
            />
            Non lues uniquement
          </label>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void load(page)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              variant="secondary"
              onClick={() => void markAllRead()}
              disabled={busy || !payload?.unread}
            >
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
          </div>
        </div>
      </Card>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {payload && payload.unread > 0 ? (
        <Alert tone="info">
          Vous avez {payload.unread} notification(s) non lue(s).
        </Alert>
      ) : null}

      {loading && !payload ? (
        <LoadingBlock label="Chargement des notifications..." />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucune notification"
            description={
              unreadOnly
                ? "Vous avez lu toutes vos notifications."
                : "Vous ne'avez aucune notification pour le moment."
            }
            icon={<Inbox className="h-8 w-8" />}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => {
            const meta = CHANNEL_META[n.channel] ?? {
              label: n.channel,
              icon: <MessageSquare className="h-4 w-4" />,
            };
            const unread = !n.readAt;
            return (
              <Card
                key={n.id}
                className={`p-4 ${unread ? "border-indigo-200 bg-indigo-50/40" : ""}`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      unread
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {meta.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {n.title}
                      </p>
                      {unread ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Nouveau
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                      {n.message}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{TYPE_LABELS[n.type] ?? n.type}</span>
                      <span>{meta.label}</span>
                      <span>{formatDateTime(n.createdAt)}</span>
                      {n.readAt ? (
                        <span>Lu le {formatDateTime(n.readAt)}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void markRead(n.id, !unread)}
                      disabled={busy}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {unread ? "Marquer lu" : "Marquer non lu"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void remove(n.id)}
                      disabled={busy}
                      aria-label="Supprimer la notification"
                    >
                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {payload && payload.pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {payload.page} sur {payload.pageCount} ({payload.total}{" "}
            notification(s))
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={payload.page <= 1 || loading}
              onClick={() => void load(payload.page - 1)}
            >
              Precedent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={payload.page >= payload.pageCount || loading}
              onClick={() => void load(payload.page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
