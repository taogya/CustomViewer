// Trace: FR-001, FR-012, FR-013, FR-014, FR-018, FR-022, FR-031, AC-014
import * as assert from "assert";
import { readFile } from "fs/promises";
import * as path from "path";

suite("package contributions", () => {
  test("declares commands, configuration, and workspace trust restrictions", async () => {
    const packageJsonPath = path.resolve(__dirname, "../../../package.json");
    const packageNlsPath = path.resolve(__dirname, "../../../package.nls.json");
    const packageNlsJaPath = path.resolve(__dirname, "../../../package.nls.ja.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as Record<string, any>;
    const packageNls = JSON.parse(await readFile(packageNlsPath, "utf8")) as Record<string, string>;
    const packageNlsJa = JSON.parse(await readFile(packageNlsJaPath, "utf8")) as Record<string, string>;

    const commands = packageJson.contributes.commands.map((command: { command: string }) => command.command);
    assert.deepStrictEqual(commands, [
      "customViewer.openDefaultPreview",
      "customViewer.chooseRendererPreview",
      "customViewer.openRendererStandalone",
      "customViewer.rerenderPreview",
      "customViewer.openSettings"
    ]);

    assert.ok(packageJson.contributes.configuration.properties["customViewer.extensionRendererMap"]);
    assert.ok(packageJson.contributes.configuration.properties["customViewer.rendererRoots"]);
    assert.deepStrictEqual(packageJson.capabilities.untrustedWorkspaces.restrictedConfigurations, [
      "customViewer.extensionRendererMap",
      "customViewer.rendererRoots"
    ]);

    assert.strictEqual(packageJson.displayName, "%extension.displayName%");
    assert.strictEqual(packageJson.description, "%extension.description%");
    assert.strictEqual(
      packageJson.capabilities.untrustedWorkspaces.description,
      "%capabilities.untrustedWorkspaces.description%"
    );
    assert.deepStrictEqual(
      packageJson.contributes.commands.map((command: { title: string; category: string }) => ({
        title: command.title,
        category: command.category
      })),
      [
        { title: "%commands.openDefaultPreview.title%", category: "%commands.category%" },
        { title: "%commands.chooseRendererPreview.title%", category: "%commands.category%" },
        { title: "%commands.openRendererStandalone.title%", category: "%commands.category%" },
        { title: "%commands.rerenderPreview.title%", category: "%commands.category%" },
        { title: "%commands.openSettings.title%", category: "%commands.category%" }
      ]
    );
    assert.strictEqual(packageJson.contributes.configuration.title, "%configuration.title%");
    assert.strictEqual(
      packageJson.contributes.configuration.properties["customViewer.extensionRendererMap"].markdownDescription,
      "%configuration.extensionRendererMap.markdownDescription%"
    );
    assert.strictEqual(
      packageJson.contributes.configuration.properties["customViewer.rendererRoots"].markdownDescription,
      "%configuration.rendererRoots.markdownDescription%"
    );

    const localizationKeys = [
      "extension.displayName",
      "extension.description",
      "capabilities.untrustedWorkspaces.description",
      "commands.category",
      "commands.openDefaultPreview.title",
      "commands.chooseRendererPreview.title",
      "commands.openRendererStandalone.title",
      "commands.rerenderPreview.title",
      "commands.openSettings.title",
      "configuration.title",
      "configuration.extensionRendererMap.markdownDescription",
      "configuration.rendererRoots.markdownDescription"
    ];

    for (const key of localizationKeys) {
      assert.ok(Object.prototype.hasOwnProperty.call(packageNls, key), `missing ${key} in package.nls.json`);
      assert.ok(Object.prototype.hasOwnProperty.call(packageNlsJa, key), `missing ${key} in package.nls.ja.json`);
    }
  });
});