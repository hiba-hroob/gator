import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const client = postgres("postgres://postgres:postgres@localhost:5432/gator?sslmode=disable");

export const db = drizzle(client, { schema });
