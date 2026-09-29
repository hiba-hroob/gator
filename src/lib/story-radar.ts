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
]);

function tokenize(title: string): string[] {
  return [
    ...new Set(
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length >= 4 &&
            !STOP_WORDS.has(word),
        ),
    ),
  ];
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

  const rightSet = new Set(right);

  let intersection = 0;

  for (const word of left) {
    if (rightSet.has(word)) {
      intersection++;
    }
  }

  return (
    intersection /
    Math.min(left.length, right.length)
  );
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
    getTimestamp(right.publishedAt);

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

function compareTitles(
  left: RadarPost,
  right: RadarPost,
): number {
  const leftTokens =
    tokenize(left.title);

  const rightTokens =
    tokenize(right.title);

  if (
    !withinTimeWindow(
      left,
      right,
    )
  ) {
    return 0;
  }

  return similarity(
    leftTokens,
    rightTokens,
  );
}

function getHost(
  url: string,
): string {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return url;
  }
}

function calculateClusterScore(
  posts: RadarPost[],
): number {
  const sourceCount =
    new Set(
      posts.map((post) =>
        getHost(post.url),
      ),
    ).size;

  const feedCount =
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
      (Date.now() - timestamp) /
        (1000 * 60 * 60),
    );

    recencyScore +=
      20 / (1 + ageHours);
  }

  return (
    sourceCount * 30 +
    feedCount * 15 +
    posts.length * 10 +
    recencyScore
  );
}

export function clusterPosts(
  posts: RadarPost[],
): StoryCluster[] {
  const clusters: RadarPost[][] = [];
  const assigned = new Set<string>();

  for (const post of posts) {
    if (assigned.has(post.id)) {
      continue;
    }

    const cluster: RadarPost[] = [
      post,
    ];

    assigned.add(post.id);

    for (const candidate of posts) {
      if (
        assigned.has(candidate.id) ||
        candidate.id === post.id
      ) {
        continue;
      }

      const score =
        compareTitles(
          post,
          candidate,
        );

      if (score >= 0.5) {
        cluster.push(candidate);
        assigned.add(candidate.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters
    .filter(
      (cluster) => cluster.length >= 2,
    )
    .map((cluster, index) => {
      const feeds =
        new Set(
          cluster.map(
            (post) => post.feedName,
          ),
        );

      const sources =
        new Set(
          cluster.map((post) =>
            getHost(post.url),
          ),
        );

      const categories =
        [
          ...new Set(
            cluster.map(
              (post) => post.category,
            ),
          ),
        ];

      const representative =
        [...cluster].sort((a, b) => {
          const aTokens =
            tokenize(a.title).length;

          const bTokens =
            tokenize(b.title).length;

          return (
            Math.abs(
              aTokens - 10,
            ) -
            Math.abs(
              bTokens - 10,
            )
          );
        })[0] ?? cluster[0];

      return {
        id: `story-${index + 1}`,
        title: representative.title,
        posts: cluster,
        sourceCount: sources.size,
        feedCount: feeds.size,
        categories,
        score:
          calculateClusterScore(
            cluster,
          ),
      };
    })
    .sort(
      (a, b) => b.score - a.score,
    );
}
