import { db } from "../index.js";
import { users } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name }).returning();
  return result;
}

export async function getUserByName(name: string) {
  return await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.name, name),
  });
}

export async function deleteAllUsers() {
  await db.delete(users);
}

export async function getUsers() {
  return await db.select().from(users);
}
