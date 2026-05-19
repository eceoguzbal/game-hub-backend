import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrate: {
    async adapter(env) {
      return new PrismaPg({ connectionString: env.DATABASE_URL });
    },
  },
});