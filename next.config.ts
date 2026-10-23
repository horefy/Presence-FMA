import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma et bcryptjs restent en dehors du bundle serveur (binaires natifs).
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Garantit l'inclusion des moteurs Prisma dans le bundle serverless Vercel.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
