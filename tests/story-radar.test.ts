import test from "node:test";
import assert from "node:assert/strict";

import {
  clusterPosts,
} from "../src/lib/story-radar.js";

test(
  "should cluster posts about the same story",
  () => {
    const posts = [
      {
        id: "1",
        title:
          "Open-source AI agents are changing developer workflows",
        url: "https://example.com/ai-agents",
        feedName: "Tech Feed",
        category: "ai",
        publishedAt:
          "2026-09-29T10:00:00Z",
      },
      {
        id: "2",
        title:
          "How open-source AI agents are transforming developer workflows",
        url: "https://another.com/agents",
        feedName: "Developer Feed",
        category: "ai",
        publishedAt:
          "2026-09-29T12:00:00Z",
      },
      {
        id: "3",
        title:
          "PostgreSQL indexing tips for production systems",
        url: "https://database.com/postgres",
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
        url: "https://example.com/db",
        feedName: "Database Feed",
        category: "database",
        publishedAt:
          "2026-09-29T10:00:00Z",
      },
      {
        id: "2",
        title:
          "New robotics model demonstrates advanced manipulation",
        url: "https://example.com/robotics",
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
