function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(text: string): string {
  return decodeHtml(
    text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

async function fetchArticleText(
  url: string,
): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Gator/2.0",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();

    return stripHtml(html).slice(0, 20000);
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

function buildSummary(
  title: string,
  text: string,
): string {
  const sentences = splitSentences(text);

  if (sentences.length === 0) {
    return [
      "• Not enough article text was available for a summary.",
      "",
      `Why it matters: ${title}`,
    ].join("\n");
  }

  const titleWords = new Set(tokenize(title));
  const frequencies = new Map<string, number>();

  for (const word of tokenize(text)) {
    frequencies.set(
      word,
      (frequencies.get(word) ?? 0) + 1,
    );
  }

  const scored = sentences.map(
    (sentence, index) => {
      const words = tokenize(sentence);
      let score = 0;

      for (const word of words) {
        score += frequencies.get(word) ?? 0;

        if (titleWords.has(word)) {
          score += 5;
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
  const articleText =
    await fetchArticleText(url);

  const sourceText =
    articleText.length > 200
      ? articleText
      : stripHtml(description ?? "");

  return buildSummary(
    title,
    sourceText,
  );
}
