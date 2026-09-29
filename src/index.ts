import { getRecommendationsForUser } from "./lib/db/queries/recommendations.js";
import { readConfig, setUser } from "./config.js";
import { getStatsForUser } from "./lib/db/queries/stats.js";
import {
  createPost,
  getPostsForUser,
  getUnreadPostsForUser,
  getPostByURL,
  markPostRead,
  markPostUnread,
  searchPosts,
  savePost,
  getSavedPostsForUser,
  unsavePost,
} from "./lib/db/queries/posts.js";
import { summarizeText } from "./ai.js";
import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users.js";

import {
  createFeed,
  getFeeds,
  getFeedByURL,
  getNextFeedToFetch,
  markFeedFetched,
} from "./lib/db/queries/feeds.js";

import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from "./lib/db/queries/feed_follows.js";

import { fetchFeed } from "./rss.js";

import type { User } from "./lib/db/schema.js";

type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

type CommandsRegistry = {
  [commandName: string]: CommandHandler;
};

function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("No user is currently logged in");
    }

    const user = await getUserByName(
      config.currentUserName,
    );

    if (!user) {
      throw new Error(
        `User ${config.currentUserName} does not exist`,
      );
    }

    await handler(cmdName, user, ...args);
  };
}

async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const user = await getUserByName(username);

  if (!user) {
    throw new Error(
      `User ${username} does not exist`,
    );
  }

  const config = readConfig();
  setUser(config, username);

  console.log(
    `User has been set to ${username}`,
  );
}

async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const existingUser =
    await getUserByName(username);

  if (existingUser) {
    throw new Error(
      `User ${username} already exists`,
    );
  }

  const user = await createUser(username);

  const config = readConfig();
  setUser(config, username);

  console.log(
    `User ${username} was created`,
  );

  console.log(user);
}

async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteAllUsers();

  console.log(
    "Database reset successfully",
  );
}

async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const users = await getUsers();
  const config = readConfig();

  for (const user of users) {
    if (
      user.name === config.currentUserName
    ) {
      console.log(
        `* ${user.name} (current)`,
      );
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error(
      "name and url are required",
    );
  }

  const name = args[0];
  const url = args[1];
  const category = args[2] || "general";

  const feed = await createFeed(
    name,
    url,
    user.id,
    category,
  );

  const follow = await createFeedFollow(
    user.id,
    feed.id,
  );

  console.log(feed);

  console.log(
    `Feed ${follow.feedName} followed by ${follow.userName}`,
  );
}

async function handlerFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`* ${feed.name}`);
    console.log(`  Category: ${feed.category}`);
    console.log(`  URL: ${feed.url}`);
    console.log(`  User: ${feed.userName}`);
    console.log();
  }
}

async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("url is required");
  }

  const url = args[0];

  const feed = await getFeedByURL(url);

  if (!feed) {
    throw new Error(
      `Feed ${url} does not exist`,
    );
  }

  const follow = await createFeedFollow(
    user.id,
    feed.id,
  );

  console.log(
    `Feed ${follow.feedName} followed by ${follow.userName}`,
  );
}

async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows =
    await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(
      `* ${follow.feedName}`,
    );
  }
}

async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("url is required");
  }

  const url = args[0];

  const feed = await getFeedByURL(url);

  if (!feed) {
    throw new Error(
      `Feed ${url} does not exist`,
    );
  }

  await deleteFeedFollow(
    user.id,
    feed.id,
  );

  console.log(
    `Unfollowed ${feed.name}`,
  );
}

function parseDuration(
  durationStr: string,
): number {
  const regex =
    /^(\d+)(ms|s|m|h)$/;

  const match =
    durationStr.match(regex);

  if (!match) {
    throw new Error(
      "Invalid duration. Use a number followed by ms, s, m, or h",
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return amount;

    case "s":
      return amount * 1000;

    case "m":
      return amount * 60 * 1000;

    case "h":
      return amount * 60 * 60 * 1000;

    default:
      throw new Error(
        "Invalid duration",
      );
  }
}

function formatDuration(
  ms: number,
): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds =
    Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    const remainingSeconds =
      seconds % 60;

    return `${minutes}m${remainingSeconds}s`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remainingMinutes =
    minutes % 60;

  const remainingSeconds =
    seconds % 60;

  return `${hours}h${remainingMinutes}m${remainingSeconds}s`;
}

async function scrapeFeeds(): Promise<void> {
  const feed =
    await getNextFeedToFetch();

  if (!feed) {
    console.log(
      "No feeds to fetch",
    );

    return;
  }

  console.log(
    `Fetching feed: ${feed.name}`,
  );

  const rssFeed =
    await fetchFeed(feed.url);

  await markFeedFetched(feed.id);

  for (
    const item of rssFeed.channel.item
  ) {
    let publishedAt:
      Date | null = null;

    if (item.pubDate) {
      const parsedDate =
        new Date(item.pubDate);

      if (
        !Number.isNaN(
          parsedDate.getTime(),
        )
      ) {
        publishedAt =
          parsedDate;
      }
    }

    await createPost(
      item.title,
      item.link,
      item.description ?? null,
      publishedAt,
      feed.id,
    );
  }
}

async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(
      "time_between_reqs is required",
    );
  }

  const timeBetweenRequests =
    parseDuration(args[0]);

  console.log(
    `Collecting feeds every ${formatDuration(
      timeBetweenRequests,
    )}`,
  );

  const handleError = (
    error: unknown,
  ) => {
    console.error(error);
  };

  await scrapeFeeds().catch(
    handleError,
  );

  const interval =
    setInterval(() => {
      scrapeFeeds().catch(
        handleError,
      );
    }, timeBetweenRequests);

  await new Promise<void>(
    (resolve) => {
      process.on(
        "SIGINT",
        () => {
          console.log(
            "Shutting down feed aggregator...",
          );

          clearInterval(interval);
          resolve();
        },
      );
    },
  );
}

async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  let limit = 10;
  let category: string | undefined;
  let unreadOnly = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--unread") {
      unreadOnly = true;
      continue;
    }

    if (arg === "--category") {
      if (i + 1 >= args.length) {
        throw new Error("category is required");
      }

      category = args[i + 1];
      i++;
      continue;
    }

    if (arg === "--limit") {
      if (i + 1 >= args.length) {
        throw new Error("limit is required");
      }

      const parsedLimit = Number(args[i + 1]);

      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit <= 0
      ) {
        throw new Error(
          "limit must be a positive integer",
        );
      }

      limit = parsedLimit;
      i++;
      continue;
    }

    const parsedLimit = Number(arg);

    if (
      Number.isInteger(parsedLimit) &&
      parsedLimit > 0
    ) {
      limit = parsedLimit;
      continue;
    }

    if (!category) {
      category = arg;
      continue;
    }

    throw new Error(`Unknown browse option: ${arg}`);
  }

  if (unreadOnly && category) {
    throw new Error(
      "--unread cannot be combined with a category yet",
    );
  }

  const posts = unreadOnly
    ? await getUnreadPostsForUser(
        user.id,
        limit,
      )
    : await getPostsForUser(
        user.id,
        limit,
        category,
      );

  if (unreadOnly) {
    console.log("Unread posts:");
  } else if (category) {
    console.log(
      `Posts in category: ${category}`,
    );
  }

  if (posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  Category: ${post.category}`);
    console.log(`  Feed: ${post.feedName}`);
    console.log(`  URL: ${post.url}`);

    if (post.description) {
      console.log(
        `  Description: ${post.description}`,
      );
    }

    if (post.publishedAt) {
      console.log(
        `  Published: ${post.publishedAt}`,
      );
    }

    console.log();
  }
}

async function handlerSearch(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("search query is required");
  }

  let category: string | undefined;
  const queryArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--category") {
      if (i + 1 >= args.length) {
        throw new Error("category is required");
      }

      category = args[i + 1];
      i++;
      continue;
    }

    queryArgs.push(args[i]);
  }

  if (queryArgs.length === 0) {
    throw new Error("search query is required");
  }

  const query = queryArgs.join(" ");

  const posts = await searchPosts(
    user.id,
    query,
    20,
    category,
  );

  console.log(`Search results for: ${query}`);

  if (category) {
    console.log(`Category: ${category}`);
  }

  if (posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  Category: ${post.category}`);
    console.log(`  Feed: ${post.feedName}`);
    console.log(`  URL: ${post.url}`);

    if (post.publishedAt) {
      console.log(`  Published: ${post.publishedAt}`);
    }

    console.log();
  }
}

async function handlerSave(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(
      "post URL is required",
    );
  }

  const postUrl = args[0];

  const saved =
    await savePost(
      user.id,
      postUrl,
    );

  if (!saved) {
    console.log(
      "Post is already saved",
    );

    return;
  }

  console.log(
    "Post saved successfully",
  );
}

async function handlerSaved(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  let limit = 20;

  if (args.length > 0) {
    limit = Number(args[0]);

    if (
      !Number.isInteger(limit) ||
      limit <= 0
    ) {
      throw new Error(
        "limit must be a positive integer",
      );
    }
  }

  const savedPosts =
    await getSavedPostsForUser(
      user.id,
      limit,
    );

  if (savedPosts.length === 0) {
    console.log(
      "No saved posts.",
    );

    return;
  }

  console.log(
    "Saved posts:",
  );

  for (const post of savedPosts) {
    console.log(
      `* ${post.title}`,
    );

    console.log(
      `  Category: ${post.category}`,
    );

    console.log(
      `  Feed: ${post.feedName}`,
    );

    console.log(
      `  URL: ${post.url}`,
    );

    if (post.publishedAt) {
      console.log(
        `  Published: ${post.publishedAt}`,
      );
    }

    console.log();
  }
}

async function handlerUnsave(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(
      "post URL is required",
    );
  }

  const postUrl = args[0];

  await unsavePost(
    user.id,
    postUrl,
  );

  console.log(
    "Post unsaved successfully",
  );
}

async function handlerRead(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("post URL is required");
  }

  const postUrl = args[0];

  const result = await markPostRead(
    user.id,
    postUrl,
  );

  if (!result) {
    console.log("Post is already marked as read");
    return;
  }

  console.log("Post marked as read");
}

async function handlerUnread(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("post URL is required");
  }

  const postUrl = args[0];

  await markPostUnread(
    user.id,
    postUrl,
  );

  console.log("Post marked as unread");
}
async function handlerStats(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const stats = await getStatsForUser(user.id);

  console.log("🐊 Gator Stats");
  console.log();

  console.log(`Feeds followed: ${stats.feeds}`);
  console.log(`Total posts: ${stats.posts}`);
  console.log(`Unread posts: ${stats.unread}`);
  console.log(`Saved posts: ${stats.saved}`);
  console.log();

  console.log("Categories:");

  if (stats.categories.length === 0) {
    console.log("* No categories yet");
    return;
  }

  for (const category of stats.categories) {
    console.log(
      `* ${category.category}: ${category.count}`,
    );
  }
}

async function handlerForYou(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  let limit = 10;

  if (args.length > 0) {
    const parsedLimit = Number(args[0]);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit <= 0
    ) {
      throw new Error(
        "limit must be a positive integer",
      );
    }

    limit = parsedLimit;
  }

  const posts =
    await getRecommendationsForUser(
      user.id,
      limit,
    );

  console.log("🐊 For You");
  console.log();

  if (posts.length === 0) {
    console.log("No recommendations yet.");
    return;
  }

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  Category: ${post.category}`);
    console.log(`  Feed: ${post.feedName}`);
    console.log(`  URL: ${post.url}`);
    console.log(`  Why: ${post.reason}`);

    if (post.publishedAt) {
      console.log(
        `  Published: ${post.publishedAt}`,
      );
    }

    console.log();
  }
}

async function handlerSummarize(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("post URL is required");
  }

  const postUrl = args[0];

  const post = await getPostByURL(postUrl);

  if (!post) {
    throw new Error(
      `Post ${postUrl} does not exist`,
    );
  }

  console.log(`🤖 Smart Summary`);
  console.log();
  console.log(`Title: ${post.title}`);
  console.log(`Feed: ${post.feedName}`);
  console.log(`Category: ${post.category}`);
  console.log();

 const summary = await summarizeText(
  post.title,
  post.description,
  post.url,
);

  console.log(summary);
}
async function main(): Promise<void> {
  const registry: CommandsRegistry = {};

  registerCommand(
    registry,
    "login",
    handlerLogin,
  );

  registerCommand(
    registry,
    "register",
    handlerRegister,
  );

  registerCommand(
    registry,
    "reset",
    handlerReset,
  );
registerCommand(
  registry,
  "summarize",
  middlewareLoggedIn(handlerSummarize),
);
  registerCommand(
    registry,
    "users",
    handlerUsers,
  );

  registerCommand(
    registry,
    "addfeed",
    middlewareLoggedIn(
      handlerAddFeed,
    ),
  );

  registerCommand(
    registry,
    "feeds",
    handlerFeeds,
  );

  registerCommand(
    registry,
    "follow",
    middlewareLoggedIn(
      handlerFollow,
    ),
  );

  registerCommand(
    registry,
    "following",
    middlewareLoggedIn(
      handlerFollowing,
    ),
  );

  registerCommand(
    registry,
    "unfollow",
    middlewareLoggedIn(
      handlerUnfollow,
    ),
  );

  registerCommand(
    registry,
    "agg",
    handlerAgg,
  );

  registerCommand(
    registry,
    "browse",
    middlewareLoggedIn(
      handlerBrowse,
    ),
  );

  registerCommand(
    registry,
    "search",
    middlewareLoggedIn(
      handlerSearch,
    ),
  );

  registerCommand(
    registry,
    "save",
    middlewareLoggedIn(
      handlerSave,
    ),
  );

  registerCommand(
    registry,
    "saved",
    middlewareLoggedIn(
      handlerSaved,
    ),
  );

  registerCommand(
    registry,
    "unsave",
    middlewareLoggedIn(
      handlerUnsave,
    ),
  );

registerCommand(
  registry,
  "read",
  middlewareLoggedIn(handlerRead),
);

registerCommand(
  registry,
  "stats",
  middlewareLoggedIn(handlerStats),
);


registerCommand(
  registry,
  "for-you",
  middlewareLoggedIn(handlerForYou),
);

registerCommand(
  registry,
  "unread",
  middlewareLoggedIn(handlerUnread),
);

  const args =
    process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      "Not enough arguments",
    );

    process.exit(1);
  }

  const [
    cmdName,
    ...cmdArgs
  ] = args;

  try {
    await runCommand(
      registry,
      cmdName,
      ...cmdArgs,
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

await main();
