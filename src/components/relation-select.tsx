"use client";

import * as React from "react";
import { Select } from "@/components/ui";

export interface RelationSelectProps {
  model: string;
  labelFields: string[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  filter?: Record<string, unknown>;
  placeholder?: string;
  id?: string;
}

/**
 * Select chargeant ses options depuis l'API des options relationnelles.
 * Les options sont mises en cache par (modele, champs de libelle).
 */
const cache = new Map<string, { value: string; label: string }[]>();

export function RelationSelect({
  model,
  labelFields,
  value,
  onChange,
  required,
  disabled,
  invalid,
  filter,
  placeholder = "-- Selectionner --",
  id,
}: RelationSelectProps) {
  const [options, setOptions] = React.useState<{ value: string; label: string }[]>(
    () => cache.get(`${model}|${labelFields.join(",")}`) ?? [],
  );
  const [loading, setLoading] = React.useState(
    !cache.has(`${model}|${labelFields.join(",")}`),
  );

  React.useEffect(() => {
    const cacheKey = `${model}|${labelFields.join(",")}`;
    if (cache.has(cacheKey)) return; // déjà en cache : l'état initial suffit

    let cancelled = false;
    const params = new URLSearchParams({
      model,
      labelFields: labelFields.join(","),
      limit: "200",
    });
    if (filter && Object.keys(filter).length) {
      params.set("filter", JSON.stringify(filter));
    }

    fetch(`/api/meta/options?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { options: [] }))
      .then((data) => {
        if (cancelled) return;
        const opts = (data.options ?? []) as { value: string; label: string }[];
        cache.set(cacheKey, opts);
        setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [model, labelFields, filter]);

  // Si la valeur courante n'est pas dans la liste (valeur heritee), on l'ajoute.
  const options2 = React.useMemo(() => {
    if (!value) return options;
    if (options.some((o) => o.value === value)) return options;
    return [{ value, label: "Element selectionne" }, ...options];
  }, [options, value]);

  return (
    <Select
      id={id}
      required={required}
      disabled={disabled || loading}
      invalid={invalid}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{loading ? "Chargement..." : placeholder}</option>
      {options2.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
