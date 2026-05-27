import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportProject, renderHtml, renderMarkdown } from "./exporters.js";
import { appendCapture, createProject } from "./storage.js";

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lBQLGQAAAABJRU5ErkJggg==";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "stepglyph-export-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("exporters", () => {
  it("renders markdown for visible steps", () => {
    const markdown = renderMarkdown({
      project: {
        schemaVersion: "1.0.0",
        id: "proj",
        title: "Guide",
        createdAt: "now",
        updatedAt: "now",
        source: { adapter: "codex-skill" },
        settings: { redactInputs: true, theme: "default" }
      },
      steps: [
        step("Visible", false),
        step("Hidden", true)
      ]
    });

    expect(markdown).toContain("# Guide");
    expect(markdown).toContain("## 1. Visible");
    expect(markdown).not.toContain("Hidden");
  });

  it("escapes html content", () => {
    const html = renderHtml({
      project: {
        schemaVersion: "1.0.0",
        id: "proj",
        title: "<Guide>",
        createdAt: "now",
        updatedAt: "now",
        source: { adapter: "codex-skill" },
        settings: { redactInputs: true, theme: "default" }
      },
      steps: [step("<Step>", false)]
    });

    expect(html).toContain("&lt;Guide&gt;");
    expect(html).toContain("&lt;Step&gt;");
  });

  it("writes markdown, html, and json exports", async () => {
    const created = await createProject({ title: "Demo", workspaceDir: tmpDir });
    await appendCapture(created.projectDir, {
      action: "result",
      title: "Done",
      sensitive: true,
      screenshot: { kind: "png-base64", data: tinyPng, width: 1, height: 1 }
    });

    const result = await exportProject(created.projectDir, ["markdown", "html", "json"]);

    expect(result.files.length).toBe(4);
    expect(result.warnings[0]).toContain("sensitive");
    await expect(readFile(path.join(created.projectDir, "exports", "guide.md"), "utf8"))
      .resolves.toContain("# Demo");
  });
});

function step(title: string, hidden: boolean) {
  return {
    id: title,
    index: 1,
    title,
    description: "",
    hidden,
    sensitive: false,
    action: { type: "result" as const, timestamp: "now" },
    screenshot: { path: "captures/step-001.png", width: 1, height: 1, deviceScaleFactor: 1 },
    annotations: []
  };
}
