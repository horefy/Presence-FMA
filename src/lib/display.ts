import { ENUM_OPTIONS } from "./enums";
import {
  relationFieldFor,
  RELATION_PROPERTY,
  type FieldDef,
  type FieldType,
  type ResourceDef,
} from "./registry";
import { formatDate, formatDateTime, formatNumber } from "./utils";

/* -------------------------------------------------------------------------- */
/*                          Metadonnees de colonnes                            */
/* -------------------------------------------------------------------------- */

export interface ColumnInfo {
  /** Cle de la colonne (nom du champ ou nom de la relation). */
  key: string;
  /** Libelle affiche dans l'entete du tableau. */
  label: string;
  /** Type de rendu. */
  type: FieldType | "relation";
  /** Champ du formulaire correspondant (null pour une relation). */
  field?: FieldDef;
  /** Champs concatenees pour libeller une relation. */
  labelFields?: string[];
  /** Le tri est possible sur cette colonne. */
  sortable: boolean;
}

/** Decrit une colonne du tableau a partir du registre. */
export function columnInfo(
  resource: ResourceDef,
  column: string,
): ColumnInfo {
  const relField = relationFieldFor(resource, column);
  if (relField?.relation) {
    return {
      key: column,
      label: relField.label,
      type: "relation",
      field: relField,
      labelFields: relField.relation.labelFields,
      sortable: false,
    };
  }

  const field = resource.fields.find((f) => f.name === column);
  return {
    key: column,
    label: field?.label ?? column,
    type: field?.type ?? "text",
    field,
    sortable: field ? field.type !== "relation" : false,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Rendu des valeurs                              */
/* -------------------------------------------------------------------------- */

/** Libelle d'une valeur d'enumeration. */
export function enumLabel(field: FieldDef | undefined, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const str = String(value);
  if (!field?.enumKey) return str;
  const option = ENUM_OPTIONS[field.enumKey]?.find((o) => o.value === str);
  return option?.label ?? str;
}

/** Valeur brute associee a une colonne. */
export function rawValue(
  resource: ResourceDef,
  column: string,
  row: Record<string, unknown>,
): unknown {
  const relField = relationFieldFor(resource, column);
  if (relField) return row[column];
  return row[column];
}

/** Libelle lisible d'une valeur pour le tableau et le detail. */
export function displayValue(
  resource: ResourceDef,
  column: string,
  row: Record<string, unknown>,
): string {
  const info = columnInfo(resource, column);
  const value = rawValue(resource, column, row);

  if (info.type === "relation") {
    if (!value || typeof value !== "object") return "—";
    const obj = value as Record<string, unknown>;
    const label = (info.labelFields ?? [])
      .map((f) => (obj[f] === null || obj[f] === undefined ? "" : String(obj[f])))
      .filter(Boolean)
      .join(" ");
    return label || "—";
  }

  if (value === null || value === undefined || value === "") return "—";

  switch (info.type) {
    case "date":
      return formatDate(value as string);
    case "datetime":
      return formatDateTime(value as string);
    case "checkbox":
      return value ? "Oui" : "Non";
    case "number":
      return formatNumber(value);
    case "float":
      return formatNumber(value);
    case "select":
      return enumLabel(info.field, value);
    case "time":
      return String(value);
    case "multiselect":
      return Array.isArray(value) ? value.join(", ") : String(value);
    default:
      return String(value);
  }
}

/** La colonne correspond-elle a un statut (badge colore) ? */
export function isStatusColumn(info: ColumnInfo): boolean {
  if (info.type !== "select") return false;
  const name = info.field?.name ?? "";
  return (
    name === "status" ||
    name.endsWith("Status") ||
    name === "type" ||
    name === "category" ||
    name === "channel"
  );
}

/** La colonne correspond-elle a une date (tri + badge) ? */
export function isDateColumn(info: ColumnInfo): boolean {
  return info.type === "date" || info.type === "datetime";
}

/* -------------------------------------------------------------------------- */
/*                             Detail d'un enregistrement                       */
/* -------------------------------------------------------------------------- */

/** Valeur lisible d'un champ pour la vue detaillee. */
export function fieldDisplayValue(
  resource: ResourceDef,
  field: FieldDef,
  row: Record<string, unknown>,
): string {
  if (field.type === "relation") {
    const prop = relationFieldFor(resource, field.name);
    void prop;
    const relationProp =
      RELATION_PROPERTY[field.name] ?? field.name;
    const value = row[relationProp];
    if (!value || typeof value !== "object") return "—";
    const obj = value as Record<string, unknown>;
    const label = (field.relation?.labelFields ?? [])
      .map((f) => (obj[f] === null || obj[f] === undefined ? "" : String(obj[f])))
      .filter(Boolean)
      .join(" ");
    return label || "—";
  }
  return displayValue(resource, field.name, row);
}

/** Regroupement des champs d'un enregistrement pour l'affichage detaille. */
export function detailGroups(
  resource: ResourceDef,
): { name: string; fields: FieldDef[] }[] {
  const groups: { name: string; fields: FieldDef[] }[] = [];
  for (const field of resource.fields) {
    const name = field.group ?? "Informations";
    let group = groups.find((g) => g.name === name);
    if (!group) {
      group = { name, fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
}
