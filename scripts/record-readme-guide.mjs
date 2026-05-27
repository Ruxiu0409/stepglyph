import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

const serverUrl = process.env.STEPGLYPH_SERVER_URL ?? "http://127.0.0.1:4317";
const outputDir = "docs/assets/readme";
const generatedDir = "docs/generated";

const captures = [
  {
    action: "result",
    title: "Install and start Stepglyph",
    description: "Install dependencies, run the checks, then start the local recorder and Studio service.",
    target: { kind: "rect", x: 0.08, y: 0.2, width: 0.48, height: 0.32 },
    screenshot: makeScreenshot("terminal")
  },
  {
    action: "result",
    title: "Ask Codex to use Stepglyph",
    description: "In the normal Codex session, ask Codex to use the Stepglyph skill for the workflow you want documented.",
    target: { kind: "rect", x: 0.16, y: 0.68, width: 0.58, height: 0.12 },
    screenshot: makeScreenshot("codex")
  },
  {
    action: "click",
    title: "Review and export in Studio",
    description: "Open the Studio URL, edit steps and markers, then export Markdown, HTML, and JSON.",
    target: { kind: "point", x: 0.75, y: 0.14 },
    screenshot: makeScreenshot("studio")
  }
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await mkdir(generatedDir, { recursive: true });

const start = await post("/api/sessions/start", {
  title: "How to use Stepglyph"
});

for (const capture of captures) {
  await post(`/api/sessions/${start.sessionId}/capture`, {
    action: capture.action,
    title: capture.title,
    description: capture.description,
    screenshot: {
      kind: "png-base64",
      data: capture.screenshot.toString("base64"),
      width: 1200,
      height: 760,
      deviceScaleFactor: 1
    },
    target: capture.target,
    app: "Stepglyph",
    url: "http://127.0.0.1:4317/studio"
  });
}

await post(`/api/sessions/${start.sessionId}/finish`, {});
await post(`/api/projects/${start.projectId}/export`, {
  formats: ["markdown", "html", "json"]
});

const projectDir = path.join(".stepglyph", "projects", start.projectId);
for (let index = 1; index <= captures.length; index += 1) {
  const name = `step-${String(index).padStart(3, "0")}.png`;
  await writeFile(
    path.join(outputDir, name),
    await readFile(path.join(projectDir, "captures", name))
  );
}

const guide = await readFile(path.join(projectDir, "exports", "guide.md"), "utf8");
await writeFile(path.join(generatedDir, "stepglyph-readme-guide.md"), guide, "utf8");
await writeFile(
  path.join(generatedDir, "stepglyph-readme-recording.json"),
  `${JSON.stringify({
    projectId: start.projectId,
    projectDir,
    studioUrl: `${serverUrl}/studio/${start.projectId}`,
    generatedAt: new Date().toISOString()
  }, null, 2)}\n`,
  "utf8"
);

console.log(`Recorded README guide with Stepglyph: ${start.projectId}`);
console.log(`Studio: ${serverUrl}/studio/${start.projectId}`);

async function post(endpoint, body) {
  const response = await fetch(`${serverUrl}${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${endpoint}`);
  }
  return payload;
}

function makeScreenshot(kind) {
  const width = 1200;
  const height = 760;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  const palette = {
    bg: [240, 244, 249],
    surface: [255, 255, 255],
    ink: [23, 32, 51],
    muted: [103, 112, 132],
    border: [203, 213, 225],
    blue: [37, 99, 235],
    blueSoft: [219, 234, 254],
    dark: [15, 23, 42],
    green: [20, 184, 166]
  };

  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    pixels[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      const color = sample(kind, x, y, palette);
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr(width, height)),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function sample(kind, x, y, c) {
  if (inside(x, y, 0, 0, 1200, 760)) {
    let color = c.bg;
    if (inside(x, y, 72, 72, 1056, 616)) color = c.surface;
    if (inside(x, y, 72, 72, 1056, 64)) color = c.dark;
    if (line(x, y, 72, 136, 1056, 2)) color = c.border;
    if (inside(x, y, 104, 94, 160, 18)) color = [255, 255, 255];
    if (inside(x, y, 978, 90, 116, 28)) color = c.blue;

    if (kind === "terminal") {
      if (inside(x, y, 116, 184, 620, 376)) color = [17, 24, 39];
      if (inside(x, y, 148, 230, 300, 16)) color = c.green;
      if (inside(x, y, 148, 276, 380, 16)) color = c.blueSoft;
      if (inside(x, y, 148, 322, 340, 16)) color = c.blueSoft;
      if (inside(x, y, 148, 368, 260, 16)) color = c.blueSoft;
      if (inside(x, y, 790, 194, 240, 34)) color = c.blueSoft;
      if (inside(x, y, 790, 250, 250, 18)) color = c.ink;
      if (inside(x, y, 790, 292, 302, 14)) color = c.muted;
      if (inside(x, y, 790, 326, 260, 14)) color = c.muted;
      return color;
    }

    if (kind === "codex") {
      if (inside(x, y, 116, 180, 968, 430)) color = [248, 250, 252];
      if (line(x, y, 116, 180, 968, 2) || line(x, y, 116, 610, 968, 2)) color = c.border;
      if (inside(x, y, 160, 230, 420, 48)) color = c.surface;
      if (inside(x, y, 180, 248, 300, 12)) color = c.muted;
      if (inside(x, y, 520, 356, 440, 72)) color = c.blueSoft;
      if (inside(x, y, 552, 384, 330, 14)) color = c.blue;
      if (inside(x, y, 170, 516, 720, 54)) color = c.surface;
      if (inside(x, y, 192, 536, 520, 14)) color = c.ink;
      return color;
    }

    if (kind === "studio") {
      if (inside(x, y, 100, 160, 220, 500)) color = [248, 250, 252];
      if (inside(x, y, 140, 218, 150, 42)) color = c.blueSoft;
      if (inside(x, y, 140, 288, 150, 42)) color = [255, 255, 255];
      if (inside(x, y, 356, 160, 512, 500)) color = [235, 239, 247];
      if (inside(x, y, 404, 212, 416, 270)) color = c.surface;
      if (inside(x, y, 900, 160, 184, 500)) color = [252, 253, 255];
      if (inside(x, y, 918, 210, 142, 38)) color = c.surface;
      if (inside(x, y, 918, 286, 142, 88)) color = c.surface;
      if (inside(x, y, 890, 92, 110, 28)) color = c.blue;
      return color;
    }

    return color;
  }
  return c.bg;
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function inside(x, y, rx, ry, rw, rh) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

function line(x, y, rx, ry, rw, rh) {
  return inside(x, y, rx, ry, rw, rh);
}
