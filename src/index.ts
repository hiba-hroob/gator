import { readConfig, setUser } from "./config.js";

import {
  createPost,
  getPostsForUser,
  searchPosts,
  savePost,
  getSavedPostsForUser,
  unsavePost,
} from "./lib/db/queries/posts.js";

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

  const feed = await createFeed(
    name,
    url,
    user.id,
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
    console.log(`  URL: ${feed.url}`);
    console.log(`  User: ${feed.userName}`);
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

  await markFeedFetched(
    feed.id,
  );

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
  let limit = 2;

  if (args.length > 0) {
    limit = Number(args[0]);

    if (
      Number.isNaN(limit) ||
      limit <= 0
    ) {
      throw new Error(
        "limit must be a positive number",
      );
    }
  }

  const posts =
    await getPostsForUser(
      user.id,
      limit,
    );

  for (const post of posts) {
    console.log(
      `* ${post.title}`,
    );

    console.log(
      `  URL: ${post.url}`,
    );

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

    console.log(
      `  Feed: ${post.feedName}`,
    );

    console.log();
  }
}

async function handlerSearch(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(
      "search query is required",
    );
  }

  const query =
    args.join(" ");

  const posts =
    await searchPosts(
      user.id,
      query,
      20,
    );

  console.log(
    `Search results for: ${query}`,
  );

  if (posts.length === 0) {
    console.log(
      "No posts found.",
    );

    return;
  }

  for (const post of posts) {
    console.log(
      `* ${post.title}`,
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

async function handlerSave(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(
      "post id is required",
    );
  }

  const postId = args[0];

  const saved =
    await savePost(
      user.id,
      postId,
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
      Number.isNaN(limit) ||
      limit <= 0
    ) {
      throw new Error(
        "limit must be a positive number",
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
      "post id is required",
    );
  }

  const postId = args[0];

  await unsavePost(
    user.id,
    postId,
  );

  console.log(
    "Post unsaved successfully",
  );
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
