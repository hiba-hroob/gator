import express from "express";

import { clusterPosts } from "./lib/story-radar.js";

import {
  authenticateUser,
  createSession,
  deleteSession,
  getUserBySessionToken,
  registerUser,
} from "./lib/db/queries/auth.js";

import {
  getPostsForUser,
  getUnreadPostsForUser,
  getSavedPostsForUser,
  searchPosts,
  savePost,
  unsavePost,
  markPostRead,
  markPostUnread,
} from "./lib/db/queries/posts.js";

import { getStatsForUser } from "./lib/db/queries/stats.js";

import {
  getRecommendationsForUser,
} from "./lib/db/queries/recommendations.js";

import { summarizeText } from "./ai.js";

import type { Request } from "express";

const app = express();

const PORT = Number(
  process.env.PORT ?? 3000,
);

app.use(express.json());

function getSessionToken(
  req: Request,
): string | null {
  const cookieHeader =
    req.headers.cookie ?? "";

  const cookies =
    cookieHeader
      .split(";")
      .map((part) => part.trim());

  for (const cookie of cookies) {
    const [name, value] =
      cookie.split("=");

    if (
      name === "gator_session" &&
      value
    ) {
      return decodeURIComponent(
        value,
      );
    }
  }

  return null;
}

async function getCurrentUser(
  req: Request,
) {
  const token =
    getSessionToken(req);

  if (!token) {
    return null;
  }

  return await getUserBySessionToken(
    token,
  );
}

function setSessionCookie(
  res: express.Response,
  token: string,
  expiresAt: Date,
) {
  const maxAge = Math.max(
    0,
    Math.floor(
      (expiresAt.getTime() -
        Date.now()) /
        1000,
    ),
  );

  const isProduction =
    process.env.NODE_ENV ===
    "production";

  const securePart =
    isProduction
      ? "; Secure"
      : "";

  res.setHeader(
    "Set-Cookie",
    `gator_session=${encodeURIComponent(
      token,
    )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${securePart}`,
  );
}

function clearSessionCookie(
  res: express.Response,
) {
  res.setHeader(
    "Set-Cookie",
    "gator_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
  );
}

app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      ok: true,
      message:
        "Gator API is running",
    });
  },
);

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const {
        name,
        password,
      } = req.body;

      if (
        typeof name !== "string" ||
        name.trim().length < 3
      ) {
        return res.status(400).json({
          error:
            "username must be at least 3 characters",
        });
      }

      if (
        typeof password !== "string" ||
        password.length < 8
      ) {
        return res.status(400).json({
          error:
            "password must be at least 8 characters",
        });
      }

      const user =
        await registerUser(
          name.trim(),
          password,
        );

      if (!user) {
        return res.status(409).json({
          error:
            "username already exists",
        });
      }

      const session =
        await createSession(
          user.id,
        );

      setSessionCookie(
        res,
        session.token,
        session.expiresAt,
      );

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to register user",
      });
    }
  },
);

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        name,
        password,
      } = req.body;

      if (
        typeof name !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          error:
            "username and password are required",
        });
      }

      const user =
        await authenticateUser(
          name.trim(),
          password,
        );

      if (!user) {
        return res.status(401).json({
          error:
            "invalid username or password",
        });
      }

      const session =
        await createSession(
          user.id,
        );

      setSessionCookie(
        res,
        session.token,
        session.expiresAt,
      );

      return res.json({
        user: {
          id: user.id,
          name: user.name,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to login",
      });
    }
  },
);

app.post(
  "/api/auth/logout",
  async (req, res) => {
    try {
      const token =
        getSessionToken(req);

      if (token) {
        await deleteSession(token);
      }

      clearSessionCookie(res);

      return res.json({
        ok: true,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to logout",
      });
    }
  },
);

app.get(
  "/api/me",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      return res.json({
        id: user.id,
        name: user.name,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to get current user",
      });
    }
  },
);

app.get(
  "/api/dashboard",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const stats =
        await getStatsForUser(
          user.id,
        );

      const recommendations =
        await getRecommendationsForUser(
          user.id,
          6,
        );

      return res.json({
        user: {
          id: user.id,
          name: user.name,
        },
        stats,
        recommendations,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to load dashboard",
      });
    }
  },
);

app.get(
  "/api/stories",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const posts =
        await getPostsForUser(
          user.id,
          100,
        );

      const radarPosts =
        posts.map((post) => ({
          id: post.id,
          title: post.title,
          url: post.url,
          feedName: post.feedName,
          category: post.category,
          publishedAt:
            post.publishedAt,
        }));

      const stories =
        clusterPosts(
          radarPosts,
        );

      return res.json({
        stories:
          stories.slice(0, 10),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to load stories",
      });
    }
  },
);

app.get(
  "/api/posts",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const limit =
        Number(
          req.query.limit ?? 20,
        );

      if (
        !Number.isInteger(limit) ||
        limit <= 0
      ) {
        return res.status(400).json({
          error:
            "limit must be a positive integer",
        });
      }

      const category =
        typeof req.query.category ===
          "string" &&
        req.query.category.trim()
          ? req.query.category
          : undefined;

      const unread =
        req.query.unread === "true";

      const posts = unread
        ? await getUnreadPostsForUser(
            user.id,
            limit,
          )
        : await getPostsForUser(
            user.id,
            limit,
            category,
          );

      return res.json({
        posts,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to load posts",
      });
    }
  },
);

app.get(
  "/api/search",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const query =
        typeof req.query.q ===
          "string"
          ? req.query.q.trim()
          : "";

      if (!query) {
        return res.status(400).json({
          error:
            "search query is required",
        });
      }

      const category =
        typeof req.query.category ===
          "string" &&
        req.query.category.trim()
          ? req.query.category
          : undefined;

      const posts =
        await searchPosts(
          user.id,
          query,
          20,
          category,
        );

      return res.json({
        posts,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Search failed",
      });
    }
  },
);

app.get(
  "/api/saved",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const posts =
        await getSavedPostsForUser(
          user.id,
          50,
        );

      return res.json({
        posts,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to load saved posts",
      });
    }
  },
);

app.post(
  "/api/posts/read",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const { url } = req.body;

      if (
        typeof url !== "string" ||
        !url
      ) {
        return res.status(400).json({
          error:
            "post URL is required",
        });
      }

      const result =
        await markPostRead(
          user.id,
          url,
        );

      return res.json({
        ok: true,
        alreadyRead: !result,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to mark post as read",
      });
    }
  },
);

app.post(
  "/api/posts/unread",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const { url } = req.body;

      if (
        typeof url !== "string" ||
        !url
      ) {
        return res.status(400).json({
          error:
            "post URL is required",
        });
      }

      await markPostUnread(
        user.id,
        url,
      );

      return res.json({
        ok: true,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to mark post as unread",
      });
    }
  },
);

app.post(
  "/api/posts/save",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const { url } = req.body;

      if (
        typeof url !== "string" ||
        !url
      ) {
        return res.status(400).json({
          error:
            "post URL is required",
        });
      }

      const result =
        await savePost(
          user.id,
          url,
        );

      return res.json({
        ok: true,
        alreadySaved: !result,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to save post",
      });
    }
  },
);

app.delete(
  "/api/posts/save",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const url =
        typeof req.query.url ===
          "string"
          ? req.query.url
          : "";

      if (!url) {
        return res.status(400).json({
          error:
            "post URL is required",
        });
      }

      await unsavePost(
        user.id,
        url,
      );

      return res.json({
        ok: true,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to unsave post",
      });
    }
  },
);

app.get(
  "/api/posts/summary",
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(req);

      if (!user) {
        return res.status(401).json({
          error:
            "Not authenticated",
        });
      }

      const url =
        typeof req.query.url ===
          "string"
          ? req.query.url
          : "";

      if (!url) {
        return res.status(400).json({
          error:
            "post URL is required",
        });
      }

      const posts =
        await searchPosts(
          user.id,
          url,
          1,
        );

      const post =
        posts[0];

      if (!post) {
        return res.status(404).json({
          error:
            "Post not found",
        });
      }

      const summary =
        await summarizeText(
          post.title,
          post.description,
          post.url,
        );

      return res.json({
        title: post.title,
        summary,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Failed to summarize post",
      });
    }
  },
);

app.listen(
  PORT,
  () => {
    console.log(
      `🐊 Gator API running on port ${PORT}`,
    );
  },
);
