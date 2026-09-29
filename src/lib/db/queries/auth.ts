import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import { db } from "../index.js";
import {
  sessions,
  users,
} from "../schema.js";
import {
  and,
  eq,
  gt,
} from "drizzle-orm";

const SESSION_DURATION_MS =
  1000 * 60 * 60 * 24 * 30;

function hashPassword(
  password: string,
): string {
  const salt =
    randomBytes(16).toString("hex");

  const hash = scryptSync(
    password,
    salt,
    64,
  ).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(
  password: string,
  storedHash: string,
): boolean {
  const [salt, key] =
    storedHash.split(":");

  if (!salt || !key) {
    return false;
  }

  const derivedKey = scryptSync(
    password,
    salt,
    64,
  );

  const storedKey =
    Buffer.from(key, "hex");

  if (
    derivedKey.length !==
    storedKey.length
  ) {
    return false;
  }

  return timingSafeEqual(
    derivedKey,
    storedKey,
  );
}

function hashSessionToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function registerUser(
  name: string,
  password: string,
) {
  const existingUser =
    await db.query.users.findFirst({
      where: (user, { eq }) =>
        eq(user.name, name),
    });

  if (existingUser) {
    return null;
  }

  const passwordHash =
    hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      name,
      passwordHash,
    })
    .returning();

  return user;
}

export async function authenticateUser(
  name: string,
  password: string,
) {
  const user =
    await db.query.users.findFirst({
      where: (user, { eq }) =>
        eq(user.name, name),
    });

  if (
    !user ||
    !user.passwordHash
  ) {
    return null;
  }

  const valid =
    verifyPassword(
      password,
      user.passwordHash,
    );

  if (!valid) {
    return null;
  }

  return user;
}

export async function createSession(
  userId: string,
) {
  const token =
    randomBytes(32).toString("hex");

  const tokenHash =
    hashSessionToken(token);

  const expiresAt = new Date(
    Date.now() +
      SESSION_DURATION_MS,
  );

  await db
    .insert(sessions)
    .values({
      tokenHash,
      userId,
      expiresAt,
    });

  return {
    token,
    expiresAt,
  };
}

export async function getUserBySessionToken(
  token: string,
) {
  const tokenHash =
    hashSessionToken(token);

  const [session] = await db
    .select({
      userId: sessions.userId,
    })
    .from(sessions)
    .where(
      and(
        eq(
          sessions.tokenHash,
          tokenHash,
        ),
        gt(
          sessions.expiresAt,
          new Date(),
        ),
      ),
    )
    .limit(1);

  if (!session) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      eq(
        users.id,
        session.userId,
      ),
    )
    .limit(1);

  return user ?? null;
}

export async function deleteSession(
  token: string,
) {
  const tokenHash =
    hashSessionToken(token);

  await db
    .delete(sessions)
    .where(
      eq(
        sessions.tokenHash,
        tokenHash,
      ),
    );
}
