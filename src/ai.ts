function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code)),
    );
}

function isVideoOrSocialUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();

    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("twitter.com") ||
      host.includes("x.com") ||
      host.includes("tiktok.com") ||
      host.includes("instagram.com")
    );
  } catch {
    return false;
  }
}

function extractMainHtml(html: string): string {
  const articleMatch = html.match(
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
  );

  if (articleMatch?.[1]) {
    return articleMatch[1];
  }

  const mainMatch = html.match(
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
  );

  if (mainMatch?.[1]) {
    return mainMatch[1];
  }

  return html;
}

function stripHtml(text: string): string {
  return decodeHtml(
    text
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " ",
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " ",
      )
      .replace(
        /<noscript[\s\S]*?<\/noscript>/gi,
        " ",
      )
      .replace(
        /<nav[\s\S]*?<\/nav>/gi,
        " ",
      )
      .replace(
        /<header[\s\S]*?<\/header>/gi,
        " ",
      )
      .replace(
        /<footer[\s\S]*?<\/footer>/gi,
        " ",
      )
      .replace(
        /<aside[\s\S]*?<\/aside>/gi,
        " ",
      )
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

async function fetchArticleText(
  url: string,
): Promise<string> {
  if (isVideoOrSocialUrl(url)) {
    return "";
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Gator/2.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();

    const mainHtml = extractMainHtml(html);
    const text = stripHtml(mainHtml);

    if (text.length < 300) {
      return "";
    }

    return text.slice(0, 30000);
  } catch {
    return "";
  }
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence.length >= 50 &&
        sentence.length <= 500,
    );
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function scoreSentences(
  title: string,
  text: string,
) {
  const sentences = splitSentences(text);

  const titleWords = new Set(
    tokenize(title),
  );

  const frequencies = new Map<string, number>();

  for (const word of tokenize(text)) {
    frequencies.set(
      word,
      (frequencies.get(word) ?? 0) + 1,
    );
  }

  return sentences.map(
    (sentence, index) => {
      const words = tokenize(sentence);

      let score = 0;

      for (const word of words) {
        score += frequencies.get(word) ?? 0;

        if (titleWords.has(word)) {
          score += 6;
        }
      }

      if (index === 0) {
        score += 8;
      }

      if (
        words.length >= 12 &&
        words.length <= 80
      ) {
        score += 4;
      }

      return {
        sentence,
        index,
        score,
      };
    },
  );
}

function buildSummary(
  title: string,
  text: string,
): string {
  const scored = scoreSentences(
    title,
    text,
  );

  if (scored.length === 0) {
    return [
      "• Not enough article text was available for a summary.",
      "",
      `Why it matters: ${title}`,
    ].join("\n");
  }

  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index);

  return [
    ...selected.map(
      (item) => `• ${item.sentence}`,
    ),
    "",
    `Why it matters: ${title}`,
  ].join("\n");
}

export async function summarizeText(
  title: string,
  description: string | null,
  url: string,
): Promise<string> {
  if (isVideoOrSocialUrl(url)) {
    return [
      "• This link points to video or social content.",
      "• A reliable article summary is not available from the RSS data.",
      "",
      `Why it matters: ${title}`,
    ].join("\n");
  }

  const articleText =
    await fetchArticleText(url);

  if (articleText) {
    return buildSummary(
      title,
      articleText,
    );
  }

  const fallback = stripHtml(
    description ?? "",
  );

  if (fallback.length > 300) {
    return buildSummary(
      title,
      fallback,
    );
  }

  return [
    "• Article content could not be extracted.",
    "• The source did not provide enough text for a reliable summary.",
    "",
    `Why it matters: ${title}`,
  ].join("\n");
}
