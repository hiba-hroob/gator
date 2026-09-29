import test from "node:test";
import assert from "node:assert/strict";

import { summarizeText } from "../src/ai.js";

test(
  "video links should not be treated as articles",
  async () => {
    const result = await summarizeText(
      "Test YouTube Video",
      "Some RSS description",
      "https://www.youtube.com/watch?v=test",
    );

    assert.match(
      result,
      /video or social content/i,
    );

    assert.match(
      result,
      /reliable article summary/i,
    );
  },
);

test(
  "summary should fall back to RSS description",
  async () => {
    const description = `
      This is a long test article description about
      software engineering and reliable systems. The
      purpose of this test is to make sure Gator can
      still produce a useful local summary when the
      original article cannot be fetched from the web.
      The system should extract important sentences from
      the available description and return them as a
      concise summary for the user.
    `.repeat(3);

    const result = await summarizeText(
      "Software Engineering Test",
      description,
      "http://127.0.0.1:1/article",
    );

    assert.match(
      result,
      /Why it matters: Software Engineering Test/i,
    );

    assert.match(
      result,
      /software engineering/i,
    );
  },
);
