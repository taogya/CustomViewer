// Trace: FR-031, NFR-009, AC-014
import * as assert from "assert";
import { readFile } from "fs/promises";
import * as path from "path";

suite("traceability", () => {
  test("key implementation and test files contain searchable Trace comments", async () => {
    const files = [
      "src/commands.ts",
      "src/configuration.ts",
      "src/rendererResolver.ts",
      "src/previewManager.ts",
      "test/suite/configuration.test.ts",
      "test/suite/rendererResolver.test.ts",
      "test/suite/previewManager.test.ts",
      "test/suite/examplesMarkdown.test.ts",
      "test/suite/examplesJson.test.ts",
      "test/suite/examplesC.test.ts"
    ];

    await Promise.all(files.map(async relativePath => {
      const fullPath = path.resolve(__dirname, "../../..", relativePath);
      const content = await readFile(fullPath, "utf8");
      assert.match(content, /Trace:\s+FR-\d{3}/, relativePath);
    }));
  });
});