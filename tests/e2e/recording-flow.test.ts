import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import httpMocks from "node-mocks-http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRecorderServer } from "@stepglyph/recorder-server";

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lBQLGQAAAABJRU5ErkJggg==";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "stepglyph-e2e-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("explicit recording flow", () => {
  it("creates a project from two capture calls and exports guides", async () => {
    const app = createRecorderServer({ workspaceDir: tmpDir });
    const start = await invoke(app, "POST", "/api/sessions/start", {
      title: "Codex guide"
    });

    await invoke(app, "POST", `/api/sessions/${start.body.sessionId}/capture`, {
      action: "navigate",
      title: "Open the page",
      description: "Codex opens the page that needs documentation.",
      screenshot: { kind: "png-base64", data: tinyPng, width: 1, height: 1 }
    });

    await invoke(app, "POST", `/api/sessions/${start.body.sessionId}/capture`, {
      action: "click",
      title: "Click settings",
      description: "Codex opens the settings panel.",
      screenshot: { kind: "png-base64", data: tinyPng, width: 1, height: 1 },
      target: { kind: "point", x: 0.5, y: 0.5 }
    });

    const finish = await invoke(app, "POST", `/api/sessions/${start.body.sessionId}/finish`, {});
    expect(finish.body.steps).toBe(2);

    const exported = await invoke(app, "POST", `/api/projects/${start.body.projectId}/export`, {
      formats: ["markdown", "html", "json"]
    });
    expect(exported.body.files.length).toBe(6);

    const guide = await readFile(
      path.join(tmpDir, "projects", start.body.projectId, "exports", "guide.md"),
      "utf8"
    );
    expect(guide).toContain("## 2. Click settings");
    expect(guide).toContain("assets/step-002-annotated.png");
  });
});

async function invoke(
  app: ReturnType<typeof createRecorderServer>,
  method: "GET" | "POST" | "PUT",
  url: string,
  body?: unknown
) {
  const req = httpMocks.createRequest({
    method,
    url,
    headers: { "content-type": "application/json" },
    body: body as Record<string, unknown> | undefined
  });
  const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve, reject) => {
    res.on("end", resolve);
    res.on("error", reject);
    app(req, res);
  });

  return {
    status: res.statusCode,
    body: res._getJSONData()
  };
}
