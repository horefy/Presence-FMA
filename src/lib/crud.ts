import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma, delegate } from "@/lib/prisma";
import type { FieldDef, ResourceDef } from "@/lib/registry";
import { isSuperAdmin } from "@/lib/permissions";

/* -------------------------------------------------------------------------- */
/*                                  Erreurs                                   */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Session                                    */
/* -------------------------------------------------------------------------- */

export interface SessionCtx {
  userId: string;
  establishmentId: string | null;
  permissions: string[];
  roles: { code: string; name: string }[];
}

export const RESERVED_PARAMS = new Set(["page", "pageSize", "q", "sort", "dir"]);

/* -------------------------------------------------------------------------- */
/*                          Introspection du modele                          */
/* -------------------------------------------------------------------------- */

const modelCache = new Map<string, Prisma.DMMF.Model | undefined>();

export function getModelInfo(model: string): Prisma.DMMF.Model | undefined {
  if (!modelCache.has(model)) {
    modelCache.set(
      model,
      Prisma.dmmf.datamodel.models.find((m) => m.name === model),
    );
  }
  return modelCache.get(model);
}

export function fieldHasDefault(model: string, field: string): boolean {
  const info = getModelInfo(model);
  const f = info?.fields.find((x) => x.name === field);
  return !!f?.hasDefaultValue;
}

export function isRelationField(model: string, field: string): boolean {
  const info = getModelInfo(model);
  const f = info?.fields.find((x) => x.name === field);
  return f?.kind === "object";
}

/* -------------------------------------------------------------------------- */
/*                          Conversion des valeurs                          */
/* -------------------------------------------------------------------------- */

/** Convertit une valeur brute (formulaire / JSON) en valeur Prisma. */
export function coerceValue(field: FieldDef, raw: unknown): unknown {
  if (raw === undefined) return undefined;
  if (raw === null) return null;

  const empty = typeof raw === "string" && raw.trim() === "";

  switch (field.type) {
    case "date": {
      if (empty) return null;
      const d = new Date(raw as string);
      if (Number.isNaN(d.getTime()))
        throw new ApiError(`Date invalide pour le champ « ${field.label} ».`);
      return d;
    }
    case "datetime": {
      if (empty) return null;
      const d = new Date(raw as string);
      if (Number.isNaN(d.getTime()))
        throw new ApiError(`Date et heure invalides pour le champ « ${field.label} ».`);
      return d;
    }
    case "time": {
      if (empty) return null;
      return String(raw).trim().slice(0, 8);
    }
    case "number": {
      if (empty) return null;
      const n = Number(raw);
      if (Number.isNaN(n))
        throw new ApiError(`Valeur numerique invalide pour le champ « ${field.label} ».`);
      return Math.trunc(n);
    }
    case "float": {
      if (empty) return null;
      const n = Number(raw);
      if (Number.isNaN(n))
        throw new ApiError(`Valeur numerique invalide pour le champ « ${field.label} ».`);
      return n;
    }
    case "checkbox": {
      return raw === true || raw === "true" || raw === "on" || raw === 1 || raw === "1";
    }
    case "multiselect": {
      if (raw === null) return [];
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === "string") {
        const t = raw.trim();
        if (!t) return [];
        if (t.startsWith("[")) {
          try {
            const parsed = JSON.parse(t);
            return Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            return [];
          }
        }
        return t
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    }
    case "json": {
      if (raw === null) return null;
      if (typeof raw === "string") {
        const t = raw.trim();
        if (!t) return null;
        try {
          return JSON.parse(t);
        } catch {
          return raw;
        }
      }
      return raw;
    }
    case "relation": {
      if (empty) return null;
      return String(raw);
    }
    case "password": {
      if (empty) return null;
      return bcrypt.hashSync(String(raw), 10);
    }
    default: {
      if (empty) return null;
      return String(raw);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                            Construction des donnees                        */
/* -------------------------------------------------------------------------- */

export function buildData(
  resource: ResourceDef,
  body: Record<string, unknown>,
  opts: { partial: boolean; session: SessionCtx },
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const field of resource.fields) {
    if (field.readonly || field.immutable) continue;

    const present = Object.prototype.hasOwnProperty.call(body, field.name);
    if (!present) {
      if (!opts.partial && field.required && !fieldHasDefault(resource.model, field.name)) {
        errors.push(`Le champ « ${field.label} » est obligatoire.`);
      }
      continue;
    }

    const value = coerceValue(field, body[field.name]);
    if (value === undefined) continue;

    // Un mot de passe vide ne doit jamais ecraser la valeur existante.
    if (field.type === "password" && value === null) continue;

    if (value === null) {
      if (!opts.partial && field.required && !fieldHasDefault(resource.model, field.name)) {
        errors.push(`Le champ « ${field.label} » est obligatoire.`);
      }
      if (!opts.partial && !field.required) {
        data[field.name] = null;
      } else if (opts.partial) {
        data[field.name] = null;
      }
      continue;
    }

    data[field.name] = value;
  }

  // Perimetre etablissement
  if (resource.establishmentScoped && !isSuperAdmin(opts.session.permissions)) {
    const target = (data.establishmentId as string | undefined) ?? opts.session.establishmentId;
    if (target && opts.session.establishmentId && target !== opts.session.establishmentId) {
      throw new ApiError("Vous ne pouvez pas intervenir sur un autre etablissement.", 403);
    }
    if (!opts.partial && !opts.session.establishmentId) {
      throw new ApiError("Aucun etablissement n'est associe a votre compte.", 403);
    }
    data.establishmentId = target ?? null;
  }

  if (errors.length) {
    throw new ApiError(errors[0], 422, errors);
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/*                                  Lecture                                   */
/* -------------------------------------------------------------------------- */

export interface ListResult {
  data: unknown[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function listRows(
  resource: ResourceDef,
  params: URLSearchParams,
  session: SessionCtx,
): Promise<ListResult> {
  const model = delegate(resource.model);
  const where: Record<string, unknown> = {};

  if (
    resource.establishmentScoped &&
    !isSuperAdmin(session.permissions) &&
    session.establishmentId
  ) {
    where.establishmentId = session.establishmentId;
  }

  const q = params.get("q")?.trim();
  if (q && resource.searchFields && resource.searchFields.length) {
    where.OR = resource.searchFields.map((f) => ({ [f]: { contains: q } }));
  }

  for (const [key, value] of params.entries()) {
    if (RESERVED_PARAMS.has(key)) continue;
    const field = resource.fields.find((f) => f.name === key);
    if (!field || value === "") continue;
    if (field.type === "relation") where[key] = value;
    else if (field.type === "number" || field.type === "float") where[key] = Number(value);
    else if (field.type === "checkbox") where[key] = value === "true";
    else where[key] = value;
  }

  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(params.get("pageSize") ?? 20) || 20));

  const requestedSort = params.get("sort");
  const dir = (params.get("dir") === "asc" ? "asc" : "desc") as "asc" | "desc";
  let orderBy: Record<string, unknown> = {};

  const sortField = resource.fields.find(
    (f) => f.name === requestedSort && f.type !== "relation",
  );
  if (sortField) {
    orderBy = { [sortField.name]: dir };
  } else if (resource.defaultSort) {
    orderBy = { [resource.defaultSort.field]: resource.defaultSort.dir };
  }

  const [total, data] = await Promise.all([
    model.count({ where }),
    model.findMany({
      where,
      include: resource.include,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getRow(resource: ResourceDef, id: string, session: SessionCtx) {
  const model = delegate(resource.model);
  const where: Record<string, unknown> = { id };
  if (
    resource.establishmentScoped &&
    !isSuperAdmin(session.permissions) &&
    session.establishmentId
  ) {
    where.establishmentId = session.establishmentId;
  }
  return model.findFirst({ where, include: { ...resource.include, ...resource.detailInclude } });
}

/* -------------------------------------------------------------------------- */
/*                                 Ecriture                                   */
/* -------------------------------------------------------------------------- */

async function assertUnique(
  resource: ResourceDef,
  data: Record<string, unknown>,
  excludeId?: string,
) {
  if (!resource.uniqueFields?.length) return;
  for (const field of resource.uniqueFields) {
    const value = data[field];
    if (value === undefined || value === null) continue;
    const existing = await delegate(resource.model).findFirst({
      where: { [field]: value },
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      const label =
        resource.fields.find((f) => f.name === field)?.label ?? field;
      throw new ApiError(
        `Un enregistrement possede deja cette valeur pour « ${label} ».`,
        409,
      );
    }
  }
}

export async function createRow(
  resource: ResourceDef,
  body: Record<string, unknown>,
  session: SessionCtx,
) {
  const data = buildData(resource, body, { partial: false, session });
  await assertUnique(resource, data);
  const model = delegate(resource.model);
  const created = await model.create({ data, include: resource.include });
  await writeAudit(session, "CREATE", resource, created.id, null, data);
  return created;
}

export async function updateRow(
  resource: ResourceDef,
  id: string,
  body: Record<string, unknown>,
  session: SessionCtx,
) {
  const model = delegate(resource.model);
  const existing = await model.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Enregistrement introuvable.", 404);

  const data = buildData(resource, body, { partial: true, session });
  await assertUnique(resource, data, id);

  const updated = await model.update({ where: { id }, data, include: resource.include });
  await writeAudit(session, "UPDATE", resource, id, existing, data);
  return updated;
}

export async function deleteRow(
  resource: ResourceDef,
  id: string,
  session: SessionCtx,
) {
  const model = delegate(resource.model);
  const existing = await model.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Enregistrement introuvable.", 404);
  await model.delete({ where: { id } });
  await writeAudit(session, "DELETE", resource, id, existing, null);
  return { id };
}

/* -------------------------------------------------------------------------- */
/*                                Journal audit                               */
/* -------------------------------------------------------------------------- */

export async function writeAudit(
  session: SessionCtx,
  action: string,
  resource: ResourceDef,
  entityId: string | null,
  oldValues: unknown,
  newValues: unknown,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        establishmentId: session.establishmentId,
        action,
        entityType: resource.model,
        entityId,
        oldValues: (oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
        newValues: (newValues ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    /* le journal ne doit jamais faire echouer l'operation metier */
  }
}

/* -------------------------------------------------------------------------- */
/*                          Traduction des erreurs Prisma                    */
/* -------------------------------------------------------------------------- */

export function translatePrismaError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return new ApiError(
          "Cette valeur existe deja (contrainte d'unicite).",
          409,
        );
      case "P2003":
        return new ApiError(
          "Suppression impossible : des enregistrements dependants existent.",
          409,
        );
      case "P2025":
        return new ApiError("Enregistrement introuvable.", 404);
      default:
        return new ApiError(`Erreur base de donnees (${error.code}).`, 400);
    }
  }
  return new ApiError("Erreur interne du serveur.", 500);
}
