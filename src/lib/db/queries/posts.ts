import { db } from "../index.js";

import {
  posts,
  feeds,
  feedFollows,
  savedPosts,
  postReads,
} from "../schema.js";

import {
  eq,
  desc,
  and,
  or,
  ilike,
  isNull,
} from "drizzle-orm";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null,
  feedId: string,
) {
  const [post] = await db
    .insert(posts)
    .values({
      title,
      url,
      description,
      publishedAt,
      feedId,
    })
    .onConflictDoNothing()
    .returning();

  return post;
}

export async function getPostsForUser(
  userId: string,
  limit: number,
  category?: string,
) {
  const conditions = [
    eq(feedFollows.userId, userId),
  ];

  if (category) {
    conditions.push(
      eq(feeds.category, category),
    );
  }

  return await db
    .select({
      id: posts.id,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedId: posts.feedId,
      feedName: feeds.name,
      category: feeds.category,
    })
    .from(posts)
    .innerJoin(
      feeds,
      eq(posts.feedId, feeds.id),
    )
    .innerJoin(
      feedFollows,
      eq(feedFollows.feedId, feeds.id),
    )
    .where(and(...conditions))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export async function searchPosts(
  userId: string,
  query: string,
  limit: number,
  category?: string,
) {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const searchConditions = terms.map(
    (term) => {
      const search = `%${term}%`;

      return or(
        ilike(posts.title, search),
        ilike(posts.description, search),
        ilike(posts.url, search),
      );
    },
  );

  const conditions = [
    eq(feedFollows.userId, userId),
    ...searchConditions,
  ];

  if (category) {
    conditions.push(
      eq(feeds.category, category),
    );
  }

  return await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
      category: feeds.category,
    })
    .from(posts)
    .innerJoin(
      feeds,
      eq(posts.feedId, feeds.id),
    )
    .innerJoin(
      feedFollows,
      eq(feedFollows.feedId, feeds.id),
    )
    .where(and(...conditions))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export async function savePost(
  userId: string,
  postUrl: string,
) {
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.url, postUrl))
    .limit(1);

  if (!post) {
    throw new Error(
      `Post ${postUrl} does not exist`,
    );
  }

  const [saved] = await db
    .insert(savedPosts)
    .values({
      userId,
      postId: post.id,
    })
    .onConflictDoNothing()
    .returning();

  return saved;
}

export async function getSavedPostsForUser(
  userId: string,
  limit: number,
) {
  return await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
      category: feeds.category,
    })
    .from(savedPosts)
    .innerJoin(
      posts,
      eq(savedPosts.postId, posts.id),
    )
    .innerJoin(
      feeds,
      eq(posts.feedId, feeds.id),
    )
    .where(
      eq(savedPosts.userId, userId),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export async function unsavePost(
  userId: string,
  postUrl: string,
) {
  const [post] = await db
    .select({
      id: posts.id,
    })
    .from(posts)
    .where(eq(posts.url, postUrl))
    .limit(1);

  if (!post) {
    throw new Error(
      `Post ${postUrl} does not exist`,
    );
  }

  await db
    .delete(savedPosts)
    .where(
      and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, post.id),
      ),
    );
}


export async function markPostRead(
  userId: string,
  postUrl: string,
) {
  const [post] = await db
    .select({
      id: posts.id,
    })
    .from(posts)
    .where(eq(posts.url, postUrl))
    .limit(1);

  if (!post) {
    throw new Error(
      `Post ${postUrl} does not exist`,
    );
  }

  const [read] = await db
    .insert(postReads)
    .values({
      userId,
      postId: post.id,
    })
    .onConflictDoNothing()
    .returning();

  return read;
}

export async function markPostUnread(
  userId: string,
  postUrl: string,
) {
  const [post] = await db
    .select({
      id: posts.id,
    })
    .from(posts)
    .where(eq(posts.url, postUrl))
    .limit(1);

  if (!post) {
    throw new Error(
      `Post ${postUrl} does not exist`,
    );
  }

  await db
    .delete(postReads)
    .where(
      and(
        eq(postReads.userId, userId),
        eq(postReads.postId, post.id),
      ),
    );
}

export async function getUnreadPostsForUser(
  userId: string,
  limit: number,
) {
  return await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
      category: feeds.category,
    })
    .from(posts)
    .innerJoin(
      feeds,
      eq(posts.feedId, feeds.id),
    )
    .innerJoin(
      feedFollows,
      eq(feedFollows.feedId, feeds.id),
    )
    .leftJoin(
      postReads,
      and(
        eq(postReads.postId, posts.id),
        eq(postReads.userId, userId),
      ),
    )
    .where(
      and(
        eq(feedFollows.userId, userId),
        isNull(postReads.id),
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}
export async function getPostByURL(
  postUrl: string,
) {
  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
      category: feeds.category,
    })
    .from(posts)
    .innerJoin(
      feeds,
      eq(posts.feedId, feeds.id),
    )
    .where(eq(posts.url, postUrl))
    .limit(1);

  return post;
}
