import type { BadgeTone } from "@/components/ui";

/**
 * Correspondance statut technique -> libelle francais et couleur.
 * Utilise par les tableaux generiques et les badges.
 */
export const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  // Users / general
  ACTIVE: { label: "Actif", tone: "green" },
  INACTIVE: { label: "Inactif", tone: "slate" },
  LOCKED: { label: "Verrouille", tone: "red" },
  PENDING: { label: "En attente", tone: "amber" },
  // Staff
  SUSPENDED: { label: "Suspendu", tone: "red" },
  RETIRED: { label: "Retraite", tone: "slate" },
  // Learners
  GRADUATED: { label: "Diplome", tone: "blue" },
  // Academic years
  PLANNED: { label: "Planifiee", tone: "violet" },
  CLOSED: { label: "Cloturee", tone: "slate" },
  // Leaves
  APPROVED: { label: "Approuve", tone: "green" },
  REJECTED: { label: "Rejete", tone: "red" },
  CANCELLED: { label: "Annule", tone: "slate" },
  // Attendance (staff)
  PRESENT: { label: "Present", tone: "green" },
  ABSENT: { label: "Absent", tone: "red" },
  LATE: { label: "En retard", tone: "amber" },
  HALF_DAY: { label: "Demi-journee", tone: "amber" },
  ON_LEAVE: { label: "En conge", tone: "blue" },
  REMOTE: { label: "Teletravail", tone: "teal" },
  HOLIDAY: { label: "Jour ferie", tone: "violet" },
  // Attendance (learner)
  EXCUSED: { label: "Excuse", tone: "blue" },
  LEFT_EARLY: { label: "Parti tot", tone: "amber" },
  // Sessions
  OPEN: { label: "Ouverte", tone: "green" },
  // Class groups
  INACTIVE_CLASS: { label: "Inactive", tone: "slate" },
  // Enrollments
  COMPLETED: { label: "Terminee", tone: "blue" },
  TRANSFERRED: { label: "Transfertee", tone: "violet" },
  // Corrections / justifications
  APPROVED_CORRECTION: { label: "Approuvee", tone: "green" },
  ACCEPTED: { label: "Accepte", tone: "green" },
  // Contracts
  EXPIRED: { label: "Expire", tone: "amber" },
  TERMINATED: { label: "Resilie", tone: "slate" },
  // Notifications
  SENT: { label: "Envoye", tone: "green" },
  FAILED: { label: "Echec", tone: "red" },
  READ: { label: "Lu", tone: "indigo" },
  // Rooms
  MAINTENANCE: { label: "Maintenance", tone: "amber" },
  // Roles
  SUPER_ADMIN: { label: "Super administrateur", tone: "violet" },
  ADMIN: { label: "Administrateur", tone: "indigo" },
  RH: { label: "Ressources humaines", tone: "teal" },
  ENSEIGNANT: { label: "Enseignant", tone: "blue" },
  SECRETARIAT: { label: "Secretariat", tone: "amber" },
  COMPTABLE: { label: "Comptable", tone: "slate" },
  TUTEUR: { label: "Tuteur", tone: "green" },
};

export function statusMeta(value: unknown): { label: string; tone: BadgeTone } {
  const key = String(value ?? "");
  return (
    STATUS_META[key] ?? {
      label: key ? key.replace(/_/g, " ").toLowerCase() : "—",
      tone: "slate",
    }
  );
}
