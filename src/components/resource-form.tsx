"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { RelationSelect } from "@/components/relation-select";
import { ENUM_OPTIONS } from "@/lib/enums";
import type { FieldDef, ResourceDef } from "@/lib/registry";
import { getErrorMessage, toDateInput, toDateTimeInput } from "@/lib/utils";

export type FormValues = Record<string, unknown>;

/** Regroupe les champs du formulaire par section, en conservant l'ordre. */
export function groupFields(fields: FieldDef[]): { name: string; fields: FieldDef[] }[] {
  const groups: { name: string; fields: FieldDef[] }[] = [];
  for (const field of fields) {
    if (field.readonly) continue;
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

function initialValue(field: FieldDef, row?: Record<string, unknown>): unknown {
  if (row && Object.prototype.hasOwnProperty.call(row, field.name)) {
    const v = row[field.name];
    if (v === null || v === undefined) return "";
    if (field.type === "date") return toDateInput(v as string);
    if (field.type === "datetime") return toDateTimeInput(v as string);
    if (field.type === "checkbox") return Boolean(v);
    if (field.type === "multiselect") return Array.isArray(v) ? v : [];
    return v;
  }
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "checkbox") return false;
  if (field.type === "multiselect") return [];
  return "";
}

/** Convertit les valeurs du formulaire en charge utile JSON. */
function toPayload(field: FieldDef, value: unknown): unknown {
  switch (field.type) {
    case "date":
      return value ? String(value) : null;
    case "datetime": {
      if (!value) return null;
      // Saisie locale interpretee en UTC pour garantir un aller-retour fidele.
      const s = String(value);
      return s.length === 16 ? `${s}:00.000Z` : `${s}Z`;
    }
    case "time":
      return value ? String(value) : null;
    case "checkbox":
      return Boolean(value);
    case "number": {
      if (value === "" || value === null || value === undefined) return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : Math.trunc(n);
    }
    case "float": {
      if (value === "" || value === null || value === undefined) return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    }
    case "multiselect":
      return Array.isArray(value) ? value : [];
    case "json":
      return value === "" ? null : value;
    case "relation":
      return value === "" ? null : value;
    case "password":
      return value === "" ? undefined : value;
    default:
      return value === "" ? null : value;
  }
}

export function ResourceForm({
  resource,
  row,
  mode,
  id,
  lockedFields = [],
  onSaved,
  onCancel,
}: {
  resource: ResourceDef;
  row?: Record<string, unknown> | null;
  mode: "create" | "edit";
  id?: string;
  lockedFields?: string[];
  onSaved?: (saved: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<FormValues>(() => {
    const init: FormValues = {};
    for (const f of resource.fields) {
      if (f.readonly) continue;
      init[f.name] = initialValue(f, row ?? undefined);
    }
    return init;
  });
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const groups = React.useMemo(
    () => groupFields(resource.fields),
    [resource.fields],
  );

  function setValue(name: string, value: unknown) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Validation des champs obligatoires visibles.
    for (const f of resource.fields) {
      if (f.readonly || f.immutable) continue;
      if (!f.required) continue;
      const v = values[f.name];
      const empty =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        setError(`Le champ « ${f.label} » est obligatoire.`);
        return;
      }
    }

    const payload: Record<string, unknown> = {};
    for (const f of resource.fields) {
      if (f.readonly || f.immutable) continue;
      const p = toPayload(f, values[f.name]);
      if (p === undefined) continue;
      payload[f.name] = p;
    }

    setLoading(true);
    try {
      const url =
        mode === "edit" && id ? `/api/${resource.key}/${id}` : `/api/${resource.key}`;
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "L'enregistrement a echoue.");
        setLoading(false);
        return;
      }
      onSaved?.(data);
      if (!onSaved && mode === "create" && data?.id) {
        router.push(`/${resource.key}/${data.id}`);
      }
      router.refresh();
    } catch (e) {
      setError(getErrorMessage(e));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {groups.map((group) => (
        <Card key={group.name}>
          <CardHeader title={group.name} />
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              {group.fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.type === "textarea" || field.type === "json"
                      ? "md:col-span-2"
                      : ""
                  }
                >
                  <Field
                    label={field.label}
                    required={field.required}
                    help={field.help}
                    htmlFor={`f_${field.name}`}
                  >
                    <FormControl
                      field={field}
                      value={values[field.name]}
                      onChange={(v) => setValue(field.name, v)}
                      disabled={lockedFields.includes(field.name)}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel ?? (() => router.back())}>
          Annuler
        </Button>
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" />
          {mode === "edit" ? "Enregistrer les modifications" : "Creer l'enregistrement"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Controle d'un champ                              */
/* -------------------------------------------------------------------------- */

function FormControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const id = `f_${field.name}`;

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          id={id}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      );

    case "json":
      return (
        <Textarea
          id={id}
          disabled={disabled}
          value={
            typeof value === "string"
              ? value
              : value
                ? JSON.stringify(value, null, 2)
                : ""
          }
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder='{ "cle": "valeur" }'
        />
      );

    case "checkbox":
      return (
        <div className="flex h-10 items-center">
          <Checkbox
            id={id}
            disabled={disabled}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );

    case "select": {
      const options = field.options ?? ENUM_OPTIONS[field.enumKey ?? ""] ?? [];
      return (
        <Select
          id={id}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- Selectionner --</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    }

    case "multiselect": {
      const options = field.options ?? ENUM_OPTIONS[field.enumKey ?? ""] ?? [];
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Select
          id={id}
          multiple
          disabled={disabled}
          value={selected}
          onChange={(e) =>
            onChange(Array.from(e.target.selectedOptions, (o) => o.value))
          }
          className="min-h-[110px]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    }

    case "relation":
      return (
        <RelationSelect
          id={id}
          model={field.relation!.model}
          labelFields={field.relation!.labelFields}
          filter={field.relation!.filter}
          required={field.required}
          disabled={disabled}
          value={(value as string) ?? null}
          onChange={onChange}
        />
      );

    case "number":
      return (
        <Input
          id={id}
          type="number"
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={1}
          value={value === "" || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "float":
      return (
        <Input
          id={id}
          type="number"
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={field.step ?? 0.5}
          value={value === "" || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "date":
      return (
        <Input
          id={id}
          type="date"
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "datetime":
      return (
        <Input
          id={id}
          type="datetime-local"
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "time":
      return (
        <Input
          id={id}
          type="time"
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "password":
      return (
        <Input
          id={id}
          type="password"
          disabled={disabled}
          autoComplete="new-password"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
        />
      );

    case "email":
      return (
        <Input
          id={id}
          type="email"
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return (
        <Input
          id={id}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
