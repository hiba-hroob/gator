export type RadarPost = {
  id: string;
  title: string;
  url: string;
  feedName: string;
  category: string;
  publishedAt: Date | string | null;
};

export type StoryCluster = {
  id: string;
  title: string;
  posts: RadarPost[];
  sourceCount: number;
  feedCount: number;
  categories: string[];
  score: number;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "been",
  "being",
  "before",
  "between",
  "could",
  "from",
  "have",
  "into",
  "more",
  "most",
  "other",
  "over",
  "same",
  "some",
  "such",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
  "the",
  "and",
  "for",
  "not",
  "are",
  "was",
  "were",
  "you",
  "how",
  "why",
  "its",
  "it's",
  "has",
  "had",
  "will",
  "can",
  "our",
  "out",
  "new",
  "just",
  "show",
  "hn",
  "read",
  "using",
  "use",
  "used",
  "about",
  "introducing",

  // Very common technology/news words.
  // They should not be enough to identify
  // two stories as the same story.
  "ai",
  "agent",
  "agents",
  "model",
  "models",
  "system",
  "systems",
  "api",
  "technology",
  "tech",
  "software",
  "developer",
  "developers",
  "application",
  "applications",
  "tool",
  "tools",
]);

function tokenize(title: string): string[] {
  return [
    ...new Set(
      title
        .toLowerCase()
        .replace(
          /[^\p{L}\p{N}\s]/gu,
          " ",
        )
        .split(/\s+/)
        .filter(
          (word) =>
            word.length >= 4 &&
            !STOP_WORDS.has(word),
        ),
    ),
  ];
}

function getHost(url: string): string {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return url
      .trim()
      .toLowerCase();
  }
}

function getTimestamp(
  publishedAt: Date | string | null,
): number | null {
  if (!publishedAt) {
    return null;
  }

  const date =
    publishedAt instanceof Date
      ? publishedAt
      : new Date(publishedAt);

  const timestamp =
    date.getTime();

  return Number.isNaN(timestamp)
    ? null
    : timestamp;
}

function withinTimeWindow(
  left: RadarPost,
  right: RadarPost,
): boolean {
  const leftTime =
    getTimestamp(left.publishedAt);

  const rightTime =
    getTimestamp(
      right.publishedAt,
    );

  if (
    leftTime === null ||
    rightTime === null
  ) {
    return true;
  }

  const hoursApart =
    Math.abs(
      leftTime - rightTime,
    ) /
    (1000 * 60 * 60);

  return hoursApart <= 72;
}

function sharedWords(
  left: string[],
  right: string[],
): number {
  const rightSet = new Set(right);

  let count = 0;

  for (const word of left) {
    if (rightSet.has(word)) {
      count++;
    }
  }

  return count;
}

function similarity(
  left: string[],
  right: string[],
): number {
  if (
    left.length === 0 ||
    right.length === 0
  ) {
    return 0;
  }

  const intersection =
    sharedWords(
      left,
      right,
    );

  const union = new Set([
    ...left,
    ...right,
  ]);

  return (
    intersection /
    union.size
  );
}

function shouldCluster(
  left: RadarPost,
  right: RadarPost,
): boolean {
  // A real multi-source story must
  // come from different domains.
  const leftHost =
    getHost(left.url);

  const rightHost =
    getHost(right.url);

  if (
    leftHost === rightHost
  ) {
    return false;
  }

  if (
    !withinTimeWindow(
      left,
      right,
    )
  ) {
    return false;
  }

  const leftTokens =
    tokenize(left.title);

  const rightTokens =
    tokenize(right.title);

  if (
    leftTokens.length === 0 ||
    rightTokens.length === 0
  ) {
    return false;
  }

  const shared =
    sharedWords(
      leftTokens,
      rightTokens,
    );

  // One common word is not enough.
  if (shared < 2) {
    return false;
  }

  const score =
    similarity(
      leftTokens,
      rightTokens,
    );

  return score >= 0.45;
}

function calculateClusterScore(
  posts: RadarPost[],
): number {
  const sources =
    new Set(
      posts.map((post) =>
        getHost(post.url),
      ),
    ).size;

  const feeds =
    new Set(
      posts.map(
        (post) => post.feedName,
      ),
    ).size;

  let recencyScore = 0;

  for (const post of posts) {
    const timestamp =
      getTimestamp(
        post.publishedAt,
      );

    if (timestamp === null) {
      continue;
    }

    const ageHours = Math.max(
      0,
      (Date.now() -
        timestamp) /
        (1000 * 60 * 60),
    );

    recencyScore +=
      20 / (1 + ageHours);
  }

  return (
    sources * 40 +
    feeds * 20 +
    posts.length * 10 +
    recencyScore
  );
}

function chooseRepresentativeTitle(
  posts: RadarPost[],
): string {
  return (
    [...posts].sort(
      (a, b) => {
        const aTokens =
          tokenize(a.title)
            .length;

        const bTokens =
          tokenize(b.title)
            .length;

        return (
          bTokens - aTokens
        );
      },
    )[0]?.title ??
    posts[0]?.title ??
    "Untitled story"
  );
}

export function clusterPosts(
  posts: RadarPost[],
): StoryCluster[] {
  const clusters: RadarPost[][] =
    [];

  const assigned =
    new Set<string>();

  for (const post of posts) {
    if (
      assigned.has(post.id)
    ) {
      continue;
    }

    const cluster: RadarPost[] =
      [post];

    assigned.add(post.id);

    for (const candidate of posts) {
      if (
        assigned.has(
          candidate.id,
        )
      ) {
        continue;
      }

      if (
        shouldCluster(
          post,
          candidate,
        )
      ) {
        cluster.push(
          candidate,
        );

        assigned.add(
          candidate.id,
        );
      }
    }

    const sourceCount =
      new Set(
        cluster.map((item) =>
          getHost(item.url),
        ),
      ).size;

    // A Story Radar card is only
    // valid when multiple sources
    // actually reported the story.
    if (
      cluster.length >= 2 &&
      sourceCount >= 2
    ) {
      clusters.push(cluster);
    }
  }

  return clusters
    .map(
      (cluster, index) => {
        const feeds =
          new Set(
            cluster.map(
              (post) =>
                post.feedName,
            ),
          );

        const sources =
          new Set(
            cluster.map(
              (post) =>
                getHost(
                  post.url,
                ),
            ),
          );

        const categories = [
          ...new Set(
            cluster.map(
              (post) =>
                post.category,
            ),
          ),
        ];

        return {
          id: `story-${index + 1}`,
          title:
            chooseRepresentativeTitle(
              cluster,
            ),
          posts: cluster,
          sourceCount:
            sources.size,
          feedCount:
            feeds.size,
          categories,
          score:
            calculateClusterScore(
              cluster,
            ),
        };
      },
    )
    .sort(
      (a, b) =>
        b.score - a.score,
    );
}
