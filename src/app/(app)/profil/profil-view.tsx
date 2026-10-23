"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  BadgeCheck,
  Building,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  LoadingBlock,
  Select,
} from "@/components/ui";
import { formatDateTime, initials } from "@/lib/utils";

interface ProfilePayload {
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    language: string;
    timezone: string;
    status: string;
    establishmentId: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    establishment: { id: string; name: string; code: string } | null;
    staffProfile: {
      id: string;
      employeeNumber: string;
      assignments: {
        position: { name: string } | null;
        department: { name: string } | null;
      }[];
    } | null;
    notificationPreferences: {
      id: string;
      eventType: string;
      inAppEnabled: boolean;
      emailEnabled: boolean;
      smsEnabled: boolean;
    }[];
  };
  roles: { id: string; code: string; name: string; description: string | null }[];
  permissions: string[];
  permissionNames: { code: string; name: string }[];
}

const LANGUAGES = [
  { value: "fr", label: "Francais" },
  { value: "en", label: "Anglais" },
  { value: "mg", label: "Malgache" },
];

const TIMEZONES = [
  { value: "Africa/Antananarivo", label: "Africa/Antananarivo (UTC+3)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+3)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (UTC+1)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+1/+2)" },
  { value: "UTC", label: "UTC" },
];

/* -------------------------------------------------------------------------- */
/*                                 Composant                                  */
/* -------------------------------------------------------------------------- */

export function ProfilView() {
  const { update } = useSession();
  const [payload, setPayload] = React.useState<ProfilePayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Formulaire d'information
  const [info, setInfo] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    language: "fr",
    timezone: "Africa/Antananarivo",
  });
  const [savingInfo, setSavingInfo] = React.useState(false);

  // Formulaire de mot de passe
  const [pwd, setPwd] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPwd, setSavingPwd] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Impossible de charger le profil.");
        return;
      }
      const p = json as ProfilePayload;
      setPayload(p);
      setError(null);
      setInfo({
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        email: p.user.email,
        phone: p.user.phone ?? "",
        language: p.user.language ?? "fr",
        timezone: p.user.timezone ?? "Africa/Antananarivo",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const flash = (message: string) => {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 4000);
  };

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Enregistrement impossible.");
      }
      await load();
      await update?.();
      flash("Vos informations ont ete mises a jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSavingInfo(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pwd.newPassword !== pwd.confirmPassword) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (pwd.newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    setSavingPwd(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwd.currentPassword,
          newPassword: pwd.newPassword,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Modification impossible.");
      }
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
      flash("Votre mot de passe a ete modifie.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading && !payload) {
    return <LoadingBlock label="Chargement du profil..." />;
  }

  if (!payload) {
    return <Alert tone="error">{error ?? "Profil indisponible."}</Alert>;
  }

  const u = payload.user;
  const isSuper = payload.permissions.includes("*");
  const grouped = groupPermissions(payload.permissionNames);

  return (
    <div className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Carte d'identite */}
        <Card className="lg:col-span-1">
          <CardBody className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-xl font-semibold text-white">
              {initials(u.firstName, u.lastName)}
            </div>
            <p className="mt-3 text-base font-semibold text-slate-900">
              {u.firstName} {u.lastName}
            </p>
            <p className="text-sm text-slate-500">{u.username}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {payload.roles.map((r) => (
                <BadgeWithKey key={r.id} code={r.code}>
                  {r.name}
                </BadgeWithKey>
              ))}
              {isSuper && !payload.roles.some((r) => r.code === "SUPER_ADMIN") ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                  <ShieldCheck className="h-3 w-3" />
                  Super administrateur
                </span>
              ) : null}
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-slate-200 pt-4 text-left text-sm">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-mail" value={u.email} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telephone" value={u.phone ?? "—"} />
              <InfoRow
                icon={<Building className="h-3.5 w-3.5" />}
                label="Etablissement"
                value={u.establishment?.name ?? "Administrateur systeme"}
              />
              {u.staffProfile ? (
                <InfoRow
                  icon={<UserCircle2 className="h-3.5 w-3.5" />}
                  label="Matricule"
                  value={u.staffProfile.employeeNumber}
                />
              ) : null}
              {u.staffProfile?.assignments[0]?.position ? (
                <InfoRow
                  icon={<BadgeCheck className="h-3.5 w-3.5" />}
                  label="Fonction"
                  value={u.staffProfile.assignments[0].position!.name}
                />
              ) : null}
              {u.staffProfile?.assignments[0]?.department ? (
                <InfoRow
                  icon={<Building className="h-3.5 w-3.5" />}
                  label="Departement"
                  value={u.staffProfile.assignments[0].department!.name}
                />
              ) : null}
              <InfoRow
                icon={<KeyRound className="h-3.5 w-3.5" />}
                label="Derniere connexion"
                value={formatDateTime(u.lastLoginAt)}
              />
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {/* Informations */}
          <Card>
            <CardHeader
              title="Informations personnelles"
              description="Mettez a jour vos coordonnees"
            />
            <CardBody>
              <form onSubmit={saveInfo} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prenom" required htmlFor="firstName">
                    <Input
                      id="firstName"
                      value={info.firstName}
                      onChange={(e) =>
                        setInfo({ ...info, firstName: e.target.value })
                      }
                      required
                    />
                  </Field>
                  <Field label="Nom" required htmlFor="lastName">
                    <Input
                      id="lastName"
                      value={info.lastName}
                      onChange={(e) =>
                        setInfo({ ...info, lastName: e.target.value })
                      }
                      required
                    />
                  </Field>
                  <Field label="Adresse e-mail" htmlFor="email">
                    <Input
                      id="email"
                      type="email"
                      value={info.email}
                      onChange={(e) => setInfo({ ...info, email: e.target.value })}
                    />
                  </Field>
                  <Field label="Telephone" htmlFor="phone">
                    <Input
                      id="phone"
                      value={info.phone}
                      onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Langue" htmlFor="language">
                    <Select
                      id="language"
                      value={info.language}
                      onChange={(e) => setInfo({ ...info, language: e.target.value })}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Fuseau horaire" htmlFor="timezone">
                    <Select
                      id="timezone"
                      value={info.timezone}
                      onChange={(e) => setInfo({ ...info, timezone: e.target.value })}
                    >
                      {TIMEZONES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" loading={savingInfo}>
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Mot de passe */}
          <Card>
            <CardHeader
              title="Securite"
              description="Changez votre mot de passe"
            />
            <CardBody>
              <form onSubmit={savePassword} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Mot de passe actuel" required htmlFor="currentPassword">
                    <Input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      value={pwd.currentPassword}
                      onChange={(e) =>
                        setPwd({ ...pwd, currentPassword: e.target.value })
                      }
                      required
                    />
                  </Field>
                  <Field
                    label="Nouveau mot de passe"
                    required
                    htmlFor="newPassword"
                    help="8 caracteres minimum"
                  >
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      value={pwd.newPassword}
                      onChange={(e) =>
                        setPwd({ ...pwd, newPassword: e.target.value })
                      }
                      required
                    />
                  </Field>
                  <Field
                    label="Confirmer"
                    required
                    htmlFor="confirmPassword"
                    error={
                      pwd.confirmPassword &&
                      pwd.confirmPassword !== pwd.newPassword
                        ? "Les mots de passe different"
                        : null
                    }
                  >
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={pwd.confirmPassword}
                      onChange={(e) =>
                        setPwd({ ...pwd, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={savingPwd}>
                    <KeyRound className="h-4 w-4" />
                    Modifier le mot de passe
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Roles et permissions */}
      <Card>
        <CardHeader
          title="Roles et permissions"
          description={
            isSuper
              ? "Acces total a toutes les ressources"
              : `${payload.roles.length} role(s) · ${payload.permissions.length} permission(s) effective(s)`
          }
        />
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mes roles
              </p>
              <ul className="space-y-2">
                {payload.roles.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {r.name}
                      </span>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                        {r.code}
                      </code>
                    </div>
                    {r.description ? (
                      <p className="mt-0.5 text-xs text-slate-500">{r.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Permissions effectives
              </p>
              {isSuper ? (
                <Alert tone="warning" title="Acces total">
                  Votre compte dispose de la permission speciale « * » : toutes les
                  ressources sont accessibles en lecture, creation, modification et
                  suppression.
                </Alert>
              ) : grouped.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune permission accordee.</p>
              ) : (
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {grouped.map(([group, items]) => (
                    <div key={group}>
                      <p className="mb-1 text-xs font-medium text-slate-600">{group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((p) => (
                          <span
                            key={p.code}
                            title={p.name}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Preferences de notification */}
      {u.notificationPreferences.length > 0 ? (
        <Card>
          <CardHeader
            title="Preferences de notification"
            description="Canaux actifs pour chaque type d'evenement"
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5">Evenement</th>
                    <th className="px-5 py-2.5 text-center">Application</th>
                    <th className="px-5 py-2.5 text-center">E-mail</th>
                    <th className="px-5 py-2.5 text-center">SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {u.notificationPreferences.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-2.5 text-slate-700">{p.eventType}</td>
                      <td className="px-5 py-2.5 text-center">
                        <Toggle on={p.inAppEnabled} />
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <Toggle on={p.emailEnabled} />
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <Toggle on={p.smsEnabled} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Fragments                                 */
/* -------------------------------------------------------------------------- */

function BadgeWithKey({
  children,
  code,
}: {
  children: React.ReactNode;
  code: string;
}) {
  const tone =
    code === "SUPER_ADMIN"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-indigo-50 text-indigo-700 ring-indigo-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      {children}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="text-right text-sm text-slate-700">{value}</dd>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 ${
        on ? "bg-indigo-600" : "bg-slate-200"
      }`}
      role="img"
      aria-label={on ? "Active" : "Desactive"}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Permissions                                   */
/* -------------------------------------------------------------------------- */

const GROUP_LABELS: Record<string, string> = {
  establishments: "Etablissements",
  "academic-years": "Annees academiques",
  terms: "Periodes",
  departments: "Departements",
  users: "Utilisateurs",
  roles: "Roles",
  permissions: "Permissions",
  staff: "Personnel",
  "staff-positions": "Fonctions",
  "staff-assignments": "Affectations",
  contracts: "Contrats",
  "staff-leaves": "Conges",
  "work-schedules": "Plannings de travail",
  learners: "Apprenants",
  guardians: "Tuteurs",
  enrollments: "Inscriptions",
  levels: "Niveaux",
  programs: "Filiere",
  "class-groups": "Classes",
  subjects: "Matieres",
  rooms: "Salles",
  "timetable-entries": "Emploi du temps",
  sessions: "Seances",
  "learner-attendances": "Presences des apprenants",
  "staff-attendances": "Presences du personnel",
  "attendance-corrections": "Corrections de presence",
  "absence-justifications": "Justificatifs d'absence",
  holidays: "Jours feries",
  notifications: "Notifications",
  "notification-preferences": "Preferences de notification",
  "file-attachments": "Pieces jointes",
  "system-settings": "Parametres systeme",
  "audit-logs": "Journal d'audit",
};

/** Regroupe les permissions par ressource. */
function groupPermissions(list: { code: string; name: string }[]) {
  const map = new Map<string, { code: string; name: string }[]>();
  for (const p of list) {
    const [resource] = p.code.split(":");
    const key = GROUP_LABELS[resource] ?? resource;
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}
