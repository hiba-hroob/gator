import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable";

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema });
