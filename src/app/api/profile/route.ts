import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireSession } from "@/lib/api-helpers";
import { ApiError } from "@/lib/crud";

/**
 * GET /api/profile : informations du compte connecte.
 */
export async function GET() {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        language: true,
        timezone: true,
        status: true,
        establishmentId: true,
        lastLoginAt: true,
        createdAt: true,
        establishment: { select: { id: true, name: true, code: true } },
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                rolePermissions: {
                  select: { permission: { select: { code: true, name: true } } },
                },
              },
            },
          },
        },
        staffProfile: {
          select: {
            id: true,
            employeeNumber: true,
            assignments: {
              where: { isPrimary: true },
              select: {
                position: { select: { name: true } },
                department: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
        notificationPreferences: {
          select: {
            id: true,
            eventType: true,
            inAppEnabled: true,
            emailEnabled: true,
            smsEnabled: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError("Utilisateur introuvable.", 404);
    }

    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
      description: ur.role.description,
    }));

    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ).sort();

    const permissionNames = Array.from(
      new Map(
        user.userRoles
          .flatMap((ur) => ur.role.rolePermissions)
          .map((rp) => [rp.permission.code, rp.permission.name]),
      ).entries(),
    ).map(([code, name]) => ({ code, name }));

    const { userRoles: _userRoles, ...rest } = user;

    return NextResponse.json({
      user: rest,
      roles,
      permissions,
      permissionNames,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/profile
 * Corps : { firstName?, lastName?, phone?, language?, timezone?, currentPassword?, newPassword? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new ApiError("Utilisateur introuvable.", 404);

    const data: Record<string, unknown> = {};

    for (const key of ["firstName", "lastName", "phone", "language", "timezone"] as const) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const value = body[key];
      if (value === null || value === "") {
        if (key === "phone") data.phone = null;
        continue;
      }
      const str = String(value).trim();
      if (!str) continue;
      if (key === "firstName" || key === "lastName") {
        if (str.length < 2) {
          throw new ApiError("Le prenom et le nom doivent contenir au moins 2 caracteres.", 422);
        }
      }
      data[key] = str;
    }

    if (body.email !== undefined) {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (email) {
        const existing = await prisma.user.findFirst({
          where: { email, NOT: { id: session.userId } },
          select: { id: true },
        });
        if (existing) {
          throw new ApiError("Cette adresse e-mail est deja utilisee.", 409);
        }
        data.email = email;
      }
    }

    // Changement de mot de passe
    if (body.newPassword) {
      const current = String(body.currentPassword ?? "");
      if (!current) {
        throw new ApiError("Le mot de passe actuel est obligatoire.", 422);
      }
      const ok = await bcrypt.compare(current, user.passwordHash);
      if (!ok) {
        throw new ApiError("Le mot de passe actuel est incorrect.", 422);
      }
      const next = String(body.newPassword);
      if (next.length < 8) {
        throw new ApiError(
          "Le nouveau mot de passe doit contenir au moins 8 caracteres.",
          422,
        );
      }
      data.passwordHash = await bcrypt.hash(next, 10);
    }

    if (!Object.keys(data).length) {
      throw new ApiError("Aucune modification a appliquer.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        language: true,
        timezone: true,
        status: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
