import {
  getUnreadPostsForUser,
  getSavedPostsForUser,
} from "./posts.js";

export async function getRecommendationsForUser(
  userId: string,
  limit: number = 10,
) {
  const unreadPosts = await getUnreadPostsForUser(
    userId,
    100,
  );

  const savedPosts = await getSavedPostsForUser(
    userId,
    100,
  );

  // We don't want to recommend posts
  // that the user already saved.
  const savedUrls = new Set(
    savedPosts.map((post) => post.url),
  );

  const categoryWeights = new Map<string, number>();
  const feedWeights = new Map<string, number>();

  for (const post of savedPosts) {
    categoryWeights.set(
      post.category,
      (categoryWeights.get(post.category) ?? 0) + 1,
    );

    feedWeights.set(
      post.feedName,
      (feedWeights.get(post.feedName) ?? 0) + 1,
    );
  }

  const now = Date.now();

  const recommendations = unreadPosts
    .filter((post) => !savedUrls.has(post.url))
    .map((post) => {
      const categoryWeight =
        categoryWeights.get(post.category) ?? 0;

      const feedWeight =
        feedWeights.get(post.feedName) ?? 0;

      let recencyScore = 0;

      if (post.publishedAt) {
        const ageHours = Math.max(
          0,
          (now - post.publishedAt.getTime()) /
            (1000 * 60 * 60),
        );

        recencyScore = 20 / (1 + ageHours);
      }

      const score =
        categoryWeight * 10 +
        feedWeight * 15 +
        recencyScore;

      let reason =
        "Recommended because it is new";

      if (feedWeight > 0 && categoryWeight > 0) {
        reason =
          `Matches a feed and category you are interested in`;
      } else if (feedWeight > 0) {
        reason =
          `You saved ${feedWeight} post(s) from this feed`;
      } else if (categoryWeight > 0) {
        reason =
          `You saved ${categoryWeight} post(s) in this category`;
      }

      return {
        ...post,
        score,
        reason,
      };
    });

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
