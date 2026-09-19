import { XMLParser } from "fast-xml-parser";

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  const xml = await response.text();

  const parser = new XMLParser({
    processEntities: false,
  });

  const data = parser.parse(xml);

  if (!data.rss || !data.rss.channel) {
    throw new Error("RSS feed is missing channel");
  }

  const channel = data.rss.channel;

  if (
    typeof channel.title !== "string" ||
    typeof channel.link !== "string" ||
    typeof channel.description !== "string"
  ) {
    throw new Error("RSS feed has invalid channel metadata");
  }

  const items: RSSItem[] = [];

  if (channel.item) {
    const rawItems = Array.isArray(channel.item)
      ? channel.item
      : [channel.item];

    for (const item of rawItems) {
      if (
        typeof item.title !== "string" ||
        typeof item.link !== "string" ||
        typeof item.description !== "string" ||
        typeof item.pubDate !== "string"
      ) {
        continue;
      }

      items.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
      });
    }
  }

  return {
    channel: {
      title: channel.title,
      link: channel.link,
      description: channel.description,
      item: items,
    },
  };
}
