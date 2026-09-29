import { db } from "../index.js";
import { savedPosts, posts, feeds } from "../schema.js";
import { and, desc, eq } from "drizzle-orm";

export async function savePost(
  userId: string,
  postId: string,
) {
  const [saved] = await db
    .insert(savedPosts)
    .values({
      userId,
      postId,
    })
    .onConflictDoNothing()
    .returning();

  return saved;
}

export async function unsavePost(
  userId: string,
  postId: string,
) {
  await db
    .delete(savedPosts)
    .where(
      and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, postId),
      ),
    );
}

export async function getSavedPosts(userId: string) {
  return await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
    })
    .from(savedPosts)
    .innerJoin(posts, eq(savedPosts.postId, posts.id))
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .where(eq(savedPosts.userId, userId))
    .orderBy(desc(posts.publishedAt));
}
