/**
 * Options des enumerations Prisma, avec libelles francais.
 * Utilise par le registre des ressources (src/lib/registry.ts).
 */

export interface Option {
  value: string;
  label: string;
}

export const ENUM_OPTIONS: Record<string, Option[]> = {
  EstablishmentType: [
    { value: "SCHOOL", label: "Ecole" },
    { value: "TRAINING_CENTER", label: "Centre de formation" },
  ],
  AcademicYearStatus: [
    { value: "PLANNED", label: "Planifiee" },
    { value: "ACTIVE", label: "Active" },
    { value: "CLOSED", label: "Cloturee" },
  ],
  TermType: [
    { value: "TERM", label: "Trimestre" },
    { value: "SEMESTER", label: "Semestre" },
    { value: "SESSION", label: "Session" },
  ],
  UserStatus: [
    { value: "ACTIVE", label: "Actif" },
    { value: "INACTIVE", label: "Inactif" },
    { value: "LOCKED", label: "Verrouille" },
    { value: "PENDING", label: "En attente" },
  ],
  Gender: [
    { value: "MALE", label: "Homme" },
    { value: "FEMALE", label: "Femme" },
    { value: "OTHER", label: "Autre" },
  ],
  StaffStatus: [
    { value: "ACTIVE", label: "Actif" },
    { value: "INACTIVE", label: "Inactif" },
    { value: "SUSPENDED", label: "Suspendu" },
    { value: "RETIRED", label: "Retraite" },
  ],
  StaffPositionCategory: [
    { value: "TEACHING", label: "Enseignement" },
    { value: "ADMINISTRATION", label: "Administration" },
    { value: "TECHNICAL", label: "Technique" },
    { value: "MANAGEMENT", label: "Direction" },
  ],
  ContractType: [
    { value: "PERMANENT", label: "Permanent" },
    { value: "TEMPORARY", label: "Temporaire" },
    { value: "CONSULTANT", label: "Consultant" },
    { value: "INTERN", label: "Stagiaire" },
  ],
  ContractStatus: [
    { value: "PENDING", label: "En attente" },
    { value: "ACTIVE", label: "Actif" },
    { value: "EXPIRED", label: "Expire" },
    { value: "TERMINATED", label: "Resilie" },
  ],
  LeaveStatus: [
    { value: "PENDING", label: "En attente" },
    { value: "APPROVED", label: "Approuve" },
    { value: "REJECTED", label: "Refuse" },
    { value: "CANCELLED", label: "Annule" },
  ],
  StaffAttendanceStatus: [
    { value: "PRESENT", label: "Present" },
    { value: "ABSENT", label: "Absent" },
    { value: "LATE", label: "En retard" },
    { value: "HALF_DAY", label: "Demi-journee" },
    { value: "ON_LEAVE", label: "En conge" },
    { value: "REMOTE", label: "Teletravail" },
    { value: "HOLIDAY", label: "Jour ferie" },
  ],
  LearnerStatus: [
    { value: "ACTIVE", label: "Actif" },
    { value: "INACTIVE", label: "Inactif" },
    { value: "GRADUATED", label: "Diplome" },
    { value: "SUSPENDED", label: "Suspendu" },
  ],
  ClassGroupStatus: [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "CLOSED", label: "Cloturee" },
  ],
  EnrollmentStatus: [
    { value: "ACTIVE", label: "Active" },
    { value: "COMPLETED", label: "Terminee" },
    { value: "TRANSFERRED", label: "Transfertee" },
    { value: "CANCELLED", label: "Annulee" },
  ],
  RoomType: [
    { value: "CLASSROOM", label: "Salle de classe" },
    { value: "LAB", label: "Laboratoire" },
    { value: "HALL", label: "Amphitheatre" },
    { value: "OFFICE", label: "Bureau" },
    { value: "OTHER", label: "Autre" },
  ],
  RoomStatus: [
    { value: "ACTIVE", label: "Disponible" },
    { value: "INACTIVE", label: "Indisponible" },
    { value: "MAINTENANCE", label: "Maintenance" },
  ],
  SessionStatus: [
    { value: "PLANNED", label: "Planifiee" },
    { value: "OPEN", label: "Ouverte" },
    { value: "CLOSED", label: "Cloturee" },
    { value: "CANCELLED", label: "Annulee" },
  ],
  LearnerAttendanceStatus: [
    { value: "PRESENT", label: "Present" },
    { value: "ABSENT", label: "Absent" },
    { value: "LATE", label: "En retard" },
    { value: "EXCUSED", label: "Excuse" },
    { value: "LEFT_EARLY", label: "Parti tot" },
  ],
  AttendanceType: [
    { value: "LEARNER", label: "Apprenant" },
    { value: "STAFF", label: "Personnel" },
  ],
  CorrectionStatus: [
    { value: "PENDING", label: "En attente" },
    { value: "APPROVED", label: "Approuvee" },
    { value: "REJECTED", label: "Rejetee" },
  ],
  JustificationStatus: [
    { value: "PENDING", label: "En attente" },
    { value: "ACCEPTED", label: "Accepte" },
    { value: "REJECTED", label: "Rejete" },
  ],
  HolidayType: [
    { value: "PUBLIC", label: "Public" },
    { value: "ESTABLISHMENT", label: "Propre a l'etablissement" },
    { value: "EXCEPTIONAL", label: "Exceptionnel" },
  ],
  NotificationChannel: [
    { value: "IN_APP", label: "Dans l'application" },
    { value: "EMAIL", label: "E-mail" },
    { value: "SMS", label: "SMS" },
  ],
  NotificationStatus: [
    { value: "PENDING", label: "En attente" },
    { value: "SENT", label: "Envoye" },
    { value: "FAILED", label: "Echec" },
    { value: "READ", label: "Lu" },
  ],
  SettingValueType: [
    { value: "STRING", label: "Texte" },
    { value: "NUMBER", label: "Nombre" },
    { value: "BOOLEAN", label: "Booleen" },
    { value: "JSON", label: "JSON" },
  ],
  // Champ libre (etablissement.status, user.language...)
  ActiveStatus: [
    { value: "ACTIVE", label: "Actif" },
    { value: "INACTIVE", label: "Inactif" },
  ],
  DayOfWeek: [
    { value: "1", label: "Lundi" },
    { value: "2", label: "Mardi" },
    { value: "3", label: "Mercredi" },
    { value: "4", label: "Jeudi" },
    { value: "5", label: "Vendredi" },
    { value: "6", label: "Samedi" },
    { value: "7", label: "Dimanche" },
  ],
  Relationship: [
    { value: "PERE", label: "Pere" },
    { value: "MERE", label: "Mere" },
    { value: "TUTEUR", label: "Tuteur" },
    { value: "TUTICE", label: "Tutrice" },
    { value: "GRAND-PERE", label: "Grand-pere" },
    { value: "GRAND-MERE", label: "Grand-mere" },
    { value: "FRERE", label: "Frere" },
    { value: "SOEUR", label: "Soeur" },
    { value: "AUTRE", label: "Autre" },
  ],
};
