import { prisma } from "@/lib/prisma";

export interface AppRole {
  id: string;
  code: string;
  name: string;
}

export interface AuthContext {
  userId: string;
  establishmentId: string | null;
  roles: AppRole[];
  permissions: string[];
}

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

/** Charge les roles et permissions d'un utilisateur depuis la base. */
export async function loadAuthContext(userId: string): Promise<AuthContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      establishmentId: true,
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              code: true,
              name: true,
              rolePermissions: { select: { permission: { select: { code: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { userId, establishmentId: null, roles: [], permissions: [] };
  }

  const roles = user.userRoles.map((ur) => ({
    id: ur.role.id,
    code: ur.role.code,
    name: ur.role.name,
  }));

  const permissions = Array.from(
    new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.code),
      ),
    ),
  );

  return {
    userId,
    establishmentId: user.establishmentId,
    roles,
    permissions,
  };
}

/** Verifie qu'une permission est accordee. "*" donne acces a tout. */
export function hasPermission(
  permissions: string[] | undefined,
  resource: string,
  action: string,
): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(`${resource}:${action}`);
}

export function isSuperAdmin(permissions: string[] | undefined): boolean {
  return !!permissions && permissions.includes("*");
}
