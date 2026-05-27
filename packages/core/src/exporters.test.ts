import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
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

    expect(result.files.length).toBe(5);
    expect(result.warnings[0]).toContain("sensitive");
    await expect(readFile(path.join(created.projectDir, "exports", "guide.md"), "utf8"))
      .resolves.toContain("# Demo");
  });

  it("writes annotated screenshots for markdown exports", async () => {
    const screenshot = solidPng(32, 32, [255, 255, 255, 255]);
    const created = await createProject({ title: "Annotated", workspaceDir: tmpDir });
    await appendCapture(created.projectDir, {
      action: "click",
      title: "Click settings",
      screenshot: {
        kind: "png-base64",
        data: screenshot.toString("base64"),
        width: 32,
        height: 32
      },
      target: { kind: "point", x: 0.5, y: 0.5 }
    });

    const result = await exportProject(created.projectDir, ["markdown"]);
    const guide = await readFile(path.join(created.projectDir, "exports", "guide.md"), "utf8");
    const annotated = await readFile(
      path.join(created.projectDir, "exports", "assets", "step-001-annotated.png")
    );

    expect(result.files.map((file) => path.relative(created.projectDir, file))).toEqual([
      path.join("exports", "assets", "step-001-annotated.png"),
      path.join("exports", "guide.md")
    ]);
    expect(guide).toContain("assets/step-001-annotated.png");
    expect(annotated.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(annotated.equals(screenshot)).toBe(false);
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

function solidPng(width: number, height: number, color: [number, number, number, number]) {
  const rowSize = width * 4 + 1;
  const pixels = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * rowSize;
    pixels[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", pngHeader(width, height)),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  return buffer;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
