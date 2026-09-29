import { db } from "../index.js";
import {
  posts,
  feeds,
  feedFollows,
  postReads,
  savedPosts,
} from "../schema.js";
import {
  and,
  count,
  desc,
  eq,
  isNull,
} from "drizzle-orm";

export async function getStatsForUser(
  userId: string,
) {
  const [feedsResult] = await db
    .select({
      count: count(),
    })
    .from(feedFollows)
    .where(
      eq(feedFollows.userId, userId),
    );

  const [postsResult] = await db
    .select({
      count: count(),
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
    .where(
      eq(feedFollows.userId, userId),
    );

  const [unreadResult] = await db
    .select({
      count: count(),
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
    );

  const [savedResult] = await db
    .select({
      count: count(),
    })
    .from(savedPosts)
    .where(
      eq(savedPosts.userId, userId),
    );

  const categories = await db
    .select({
      category: feeds.category,
      count: count(posts.id),
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
    .where(
      eq(feedFollows.userId, userId),
    )
    .groupBy(feeds.category)
    .orderBy(desc(count(posts.id)));

  return {
    feeds: Number(feedsResult.count),
    posts: Number(postsResult.count),
    unread: Number(unreadResult.count),
    saved: Number(savedResult.count),
    categories,
  };
}
