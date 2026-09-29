import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function runGator(
  ...args: string[]
): string {
  const result = spawnSync(
    "npm",
    ["run", "start", "--", ...args],
    {
      encoding: "utf8",
    },
  );

  assert.equal(
    result.status,
    0,
    result.stderr,
  );

  return result.stdout;
}

function firstPostUrl(
  output: string,
): string {
  const match =
    output.match(/^\s*URL: (.+)$/m);

  assert.ok(
    match,
    "Could not find a post URL",
  );

  return match[1];
}

test(
  "search should support a category filter",
  () => {
    const output = runGator(
      "search",
      "github",
      "--category",
      "programming",
    );

    assert.match(
      output,
      /Search results for: github/,
    );

    assert.match(
      output,
      /Category: programming/,
    );
  },
);

test(
  "save and unsave should update saved posts",
  () => {
    const browseOutput = runGator(
      "browse",
      "1",
    );

    const postUrl =
      firstPostUrl(browseOutput);

    const initialSavedOutput =
      runGator("saved");

    const wasInitiallySaved =
      initialSavedOutput.includes(
        postUrl,
      );

    const saveOutput = runGator(
      "save",
      postUrl,
    );

    assert.match(
      saveOutput,
      /Post saved successfully|Post is already saved/,
    );

    const savedOutput =
      runGator("saved");

    assert.match(
      savedOutput,
      new RegExp(
        postUrl.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    );

    runGator(
      "unsave",
      postUrl,
    );

    const finalSavedOutput =
      runGator("saved");

    if (wasInitiallySaved) {
      assert.match(
        finalSavedOutput,
        new RegExp(
          postUrl.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          ),
        ),
      );
    } else {
      assert.doesNotMatch(
        finalSavedOutput,
        new RegExp(
          postUrl.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          ),
        ),
      );
    }
  },
);

test(
  "read and unread should change unread status",
  () => {
    const browseOutput = runGator(
      "browse",
      "1",
    );

    const postUrl =
      firstPostUrl(browseOutput);

    const initialUnreadOutput =
      runGator(
        "browse",
        "--unread",
      );

    const wasInitiallyUnread =
      initialUnreadOutput.includes(
        postUrl,
      );

    runGator(
      "read",
      postUrl,
    );

    const afterRead =
      runGator(
        "browse",
        "--unread",
      );

    assert.doesNotMatch(
      afterRead,
      new RegExp(
        postUrl.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    );

    runGator(
      "unread",
      postUrl,
    );

    const afterUnread =
      runGator(
        "browse",
        "--unread",
      );

    assert.match(
      afterUnread,
      new RegExp(
        postUrl.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    );

    if (!wasInitiallyUnread) {
      runGator(
        "read",
        postUrl,
      );
    }
  },
);
