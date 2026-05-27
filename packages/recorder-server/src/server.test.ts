import { mkdtemp, rm } from "node:fs/promises";
import { EventEmitter } from "node:events";
import os from "node:os";
import path from "node:path";
import httpMocks from "node-mocks-http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRecorderServer } from "./server.js";

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lBQLGQAAAABJRU5ErkJggg==";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "stepglyph-server-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("recorder server", () => {
  it("reports explicit capture mode", async () => {
    const app = createRecorderServer({ workspaceDir: tmpDir });
    const response = await invoke(app, "GET", "/api/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.backgroundRecording).toBe(false);
  });

  it("serves the bundled sample project as a real product walkthrough", async () => {
    const app = createRecorderServer({
      workspaceDir: tmpDir,
      sampleProjectDir: path.resolve("fixtures/sample-project")
    });

    const response = await invoke(app, "GET", "/api/projects/sample-project");

    expect(response.status).toBe(200);
    expect(response.body.project.title).toBe("Stepglyph product walkthrough");
    expect(response.body.steps[0].title).toBe("Start from a blank Studio");
    expect(response.body.steps[0].description).toContain("empty local Studio");
  });

  it("starts, captures, finishes, loads, and exports a project", async () => {
    const app = createRecorderServer({ workspaceDir: tmpDir });
    const start = await invoke(app, "POST", "/api/sessions/start", { title: "Demo" });
    expect(start.status).toBe(201);
    expect(start.body.sessionId).toContain("sess_");

    const capture = await invoke(
      app,
      "POST",
      `/api/sessions/${start.body.sessionId}/capture`,
      {
        action: "click",
        title: "Open menu",
        screenshot: { kind: "png-base64", data: tinyPng, width: 1, height: 1 },
        target: { kind: "point", x: 0.5, y: 0.5 }
      }
    );
    expect(capture.status).toBe(201);
    expect(capture.body.step.annotations[0].type).toBe("click-ring");

    const finish = await invoke(app, "POST", `/api/sessions/${start.body.sessionId}/finish`, {});
    expect(finish.status).toBe(200);
    expect(finish.body.steps).toBe(1);

    const project = await invoke(app, "GET", `/api/projects/${start.body.projectId}`);
    expect(project.status).toBe(200);
    expect(project.body.steps[0].title).toBe("Open menu");

    const exported = await invoke(
      app,
      "POST",
      `/api/projects/${start.body.projectId}/export`,
      {
        formats: ["markdown", "html", "json"]
      }
    );
    expect(exported.status).toBe(200);
    expect(exported.body.files.length).toBe(5);
  });

  it("rejects capture when no session is active", async () => {
    const app = createRecorderServer({ workspaceDir: tmpDir });
    const response = await invoke(app, "POST", "/api/sessions/missing/capture", {});

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("not active");
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
