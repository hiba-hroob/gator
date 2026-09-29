import test from "node:test";
import assert from "node:assert/strict";

import {
  clusterPosts,
} from "../src/lib/story-radar.js";

test(
  "should cluster the same story from different sources",
  () => {
    const posts = [
      {
        id: "1",
        title:
          "Open-source AI agents are changing developer workflows",
        url:
          "https://tech.example.com/ai-agents",
        feedName: "Tech Feed",
        category: "ai",
        publishedAt:
          "2026-09-29T10:00:00Z",
      },
      {
        id: "2",
        title:
          "Open-source agents transform developer workflows",
        url:
          "https://news.example.com/open-agents",
        feedName: "News Feed",
        category: "ai",
        publishedAt:
          "2026-09-29T12:00:00Z",
      },
      {
        id: "3",
        title:
          "PostgreSQL indexing tips for production databases",
        url:
          "https://db.example.com/postgres",
        feedName: "Database Feed",
        category: "database",
        publishedAt:
          "2026-09-29T11:00:00Z",
      },
    ];

    const clusters =
      clusterPosts(posts);

    assert.equal(
      clusters.length,
      1,
    );

    assert.equal(
      clusters[0].posts.length,
      2,
    );

    assert.equal(
      clusters[0].sourceCount,
      2,
    );

    assert.equal(
      clusters[0].feedCount,
      2,
    );
  },
);

test(
  "should not cluster unrelated stories",
  () => {
    const posts = [
      {
        id: "1",
        title:
          "New database engine improves query performance",
        url:
          "https://db.example.com/database",
        feedName: "Database Feed",
        category: "database",
        publishedAt:
          "2026-09-29T10:00:00Z",
      },
      {
        id: "2",
        title:
          "New robotics platform demonstrates advanced manipulation",
        url:
          "https://robotics.example.com/platform",
        feedName: "Robotics Feed",
        category: "robotics",
        publishedAt:
          "2026-09-29T11:00:00Z",
      },
    ];

    const clusters =
      clusterPosts(posts);

    assert.equal(
      clusters.length,
      0,
    );
  },
);

test(
  "should not cluster posts from the same source",
  () => {
    const posts = [
      {
        id: "1",
        title:
          "Open-source routing improves agent knowledge retrieval",
        url:
          "https://news.ycombinator.com/item?id=1",
        feedName: "Hacker News RSS",
        category: "programming",
        publishedAt:
          "2026-09-29T10:00:00Z",
      },
      {
        id: "2",
        title:
          "Open-source routing improves agent knowledge systems",
        url:
          "https://news.ycombinator.com/item?id=2",
        feedName: "Hacker News RSS",
        category: "programming",
        publishedAt:
          "2026-09-29T11:00:00Z",
      },
    ];

    const clusters =
      clusterPosts(posts);

    assert.equal(
      clusters.length,
      0,
    );
  },
);
