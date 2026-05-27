import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const serverUrl = process.env.STEPGLYPH_SERVER_URL ?? "http://127.0.0.1:4317";
const fixtureDir = "fixtures/readme-computer-use";
const outputDir = "docs/assets/readme";
const generatedDir = "docs/generated";
const generatedAssetsDir = path.join(generatedDir, "assets");
const deviceScaleFactor = 2;

const captures = [
  {
    action: "result",
    title: "Open the target page in Studio",
    description: "Codex opens a clean local Safari window with Stepglyph Studio so the captured guide can be reviewed.",
    target: { kind: "rect", x: 0.23, y: 0.16, width: 0.52, height: 0.52 },
    screenshotFile: "step-001.png"
  },
  {
    action: "click",
    title: "Select the captured click step",
    description: "Computer Use selects the second step, revealing the recorded click marker and editable inspector fields.",
    target: { kind: "point", x: 0.49, y: 0.39 },
    screenshotFile: "step-002.png"
  },
  {
    action: "click",
    title: "Export the edited guide",
    description: "Computer Use clicks Export and Studio reports that the local guide files were written.",
    target: { kind: "point", x: 0.72, y: 0.09 },
    screenshotFile: "step-003.png"
  }
];

await rm(outputDir, { recursive: true, force: true });
await rm(generatedAssetsDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await mkdir(generatedDir, { recursive: true });
await mkdir(generatedAssetsDir, { recursive: true });

const start = await post("/api/sessions/start", {
  title: "How to use Stepglyph"
});

for (const capture of captures) {
  const screenshot = await readPngScreenshot(capture.screenshotFile);
  await post(`/api/sessions/${start.sessionId}/capture`, {
    action: capture.action,
    title: capture.title,
    description: capture.description,
    screenshot: {
      kind: "png-base64",
      data: screenshot.data.toString("base64"),
      width: screenshot.width,
      height: screenshot.height,
      deviceScaleFactor
    },
    target: capture.target,
    app: "Safari",
    url: `${serverUrl}/studio/sample-project`
  });
}

await post(`/api/sessions/${start.sessionId}/finish`, {});
await post(`/api/projects/${start.projectId}/export`, {
  formats: ["markdown", "html", "json"]
});

const projectDir = path.join(".stepglyph", "projects", start.projectId);
for (let index = 1; index <= captures.length; index += 1) {
  const baseName = `step-${String(index).padStart(3, "0")}`;
  const annotatedName = `${baseName}-annotated.png`;
  await copyFile(
    path.join(projectDir, "exports", "assets", annotatedName),
    path.join(outputDir, `${baseName}.png`)
  );
  await copyFile(
    path.join(projectDir, "exports", "assets", annotatedName),
    path.join(generatedAssetsDir, annotatedName)
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
    source: "real Computer Use screenshots from a clean local Safari window, exported as annotated PNGs",
    fixtureDir,
    annotatedAssetsDir: path.join(projectDir, "exports", "assets"),
    generatedAt: new Date().toISOString()
  }, null, 2)}\n`,
  "utf8"
);

console.log(`Replayed real Computer Use screenshots through Stepglyph: ${start.projectId}`);
console.log(`Studio: ${serverUrl}/studio/${start.projectId}`);

async function readPngScreenshot(fileName) {
  const data = await readFile(path.join(fixtureDir, fileName));
  if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${fileName} is not a PNG file`);
  }
  if (data.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${fileName} does not have a PNG IHDR chunk`);
  }
  return {
    data,
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

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
