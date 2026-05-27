import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendCapture, createProject, loadProject, saveSteps } from "./storage.js";

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lBQLGQAAAABJRU5ErkJggg==";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "stepglyph-core-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("storage", () => {
  it("creates and loads a local project", async () => {
    const created = await createProject({ title: "Demo", workspaceDir: tmpDir });
    const loaded = await loadProject(created.projectDir);

    expect(loaded.project.title).toBe("Demo");
    expect(loaded.steps).toEqual([]);
  });

  it("appends an explicit capture with a default annotation", async () => {
    const created = await createProject({ title: "Demo", workspaceDir: tmpDir });
    const step = await appendCapture(created.projectDir, {
      action: "click",
      title: "Open settings",
      description: "Select settings from the sidebar.",
      screenshot: {
        kind: "png-base64",
        data: tinyPng,
        width: 1,
        height: 1
      },
      target: { kind: "point", x: 0.5, y: 0.5 }
    });

    expect(step.index).toBe(1);
    expect(step.annotations[0].type).toBe("click-ring");

    const screenshot = await readFile(path.join(created.projectDir, step.screenshot.path));
    expect(screenshot.length).toBeGreaterThan(0);
  });

  it("saves reordered steps with normalized indexes", async () => {
    const created = await createProject({ title: "Demo", workspaceDir: tmpDir });
    const first = await appendCapture(created.projectDir, {
      action: "result",
      title: "First",
      screenshot: { kind: "png-base64", data: tinyPng, width: 1, height: 1 }
    });
    const second = await appendCapture(created.projectDir, {
      action: "result",
      title: "Second",
      screenshot: { kind: "png-base64", data: tinyPng, width: 1, height: 1 }
    });

    const saved = await saveSteps(created.projectDir, [second, first]);

    expect(saved.steps.map((step) => `${step.index}:${step.title}`)).toEqual([
      "1:Second",
      "2:First"
    ]);
  });
});
