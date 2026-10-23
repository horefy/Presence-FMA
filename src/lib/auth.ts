import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loadAuthContext, type AppRole } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      establishmentId: string | null;
      roles: AppRole[];
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    establishmentId?: string | null;
    roles?: AppRole[];
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    establishmentId?: string | null;
    roles?: AppRole[];
    permissions?: string[];
  }
}

/** Type du jeton de session enrichi (roles et permissions inclus). */
export type AppToken = JWT;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: { signIn: "/login" },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      id: "credentials",
      name: "Identifiants",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username: { equals: username } }, { email: { equals: username } }],
          },
        });

        if (!user) return null;
        if (user.status === "LOCKED" || user.status === "INACTIVE") return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const ctx = await loadAuthContext(user.id);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          image: user.avatarUrl,
          establishmentId: ctx.establishmentId,
          roles: ctx.roles,
          permissions: ctx.permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.establishmentId = user.establishmentId ?? null;
        token.roles = user.roles ?? [];
        token.permissions = user.permissions ?? [];
        return token;
      }
      // Rafraichissement des permissions a chaque requete si demande
      if (trigger === "update" && token.id) {
        const ctx = await loadAuthContext(token.id);
        token.establishmentId = ctx.establishmentId;
        token.roles = ctx.roles;
        token.permissions = ctx.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.establishmentId = token.establishmentId ?? null;
        session.user.roles = token.roles ?? [];
        session.user.permissions = token.permissions ?? [];
      }
      return session;
    },
  },
});
