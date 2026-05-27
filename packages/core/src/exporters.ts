import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Project, ProjectWithSteps, Step } from "./schema.js";
import { getProjectFiles, loadProject } from "./storage.js";

export type ExportFormat = "markdown" | "html" | "json";

export type ExportResult = {
  files: string[];
  warnings: string[];
};

export async function exportProject(
  projectDir: string,
  formats: ExportFormat[]
): Promise<ExportResult> {
  const projectWithSteps = await loadProject(projectDir);
  const { exportsDir } = getProjectFiles(projectDir);
  await mkdir(exportsDir, { recursive: true });

  const files: string[] = [];
  const warnings = createExportWarnings(projectWithSteps.steps);

  if (formats.includes("markdown")) {
    const file = path.join(exportsDir, "guide.md");
    await writeFile(file, renderMarkdown(projectWithSteps), "utf8");
    files.push(file);
  }

  if (formats.includes("html")) {
    const file = path.join(exportsDir, "guide.html");
    await writeFile(file, renderHtml(projectWithSteps), "utf8");
    files.push(file);
  }

  if (formats.includes("json")) {
    const projectFile = path.join(exportsDir, "project.json");
    const stepsFile = path.join(exportsDir, "steps.json");
    await writeFile(projectFile, `${JSON.stringify(projectWithSteps.project, null, 2)}\n`, "utf8");
    await writeFile(stepsFile, `${JSON.stringify(projectWithSteps.steps, null, 2)}\n`, "utf8");
    files.push(projectFile, stepsFile);
  }

  return { files, warnings };
}

export function renderMarkdown({ project, steps }: ProjectWithSteps): string {
  const visibleSteps = steps.filter((step) => !step.hidden);
  const body = visibleSteps.map((step, index) => {
    const description = step.description ? `\n\n${step.description}` : "";
    return `## ${index + 1}. ${step.title}${description}\n\n![${escapeMarkdownAlt(step.title)}](${step.screenshot.path})`;
  });

  return [`# ${project.title}`, ...body].join("\n\n").trimEnd() + "\n";
}

export function renderHtml({ project, steps }: ProjectWithSteps): string {
  const visibleSteps = steps.filter((step) => !step.hidden);
  const sections = visibleSteps.map((step, index) => renderHtmlStep(step, index + 1)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(project.title)}</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f6f7f9; }
    main { max-width: 980px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 34px; line-height: 1.1; margin: 0 0 28px; }
    article { background: #fff; border: 1px solid #d9dee8; border-radius: 8px; margin: 0 0 24px; padding: 20px; }
    h2 { font-size: 20px; margin: 0 0 8px; }
    p { color: #4b5565; line-height: 1.6; }
    .shot { position: relative; margin-top: 16px; border: 1px solid #d9dee8; border-radius: 6px; overflow: hidden; background: #eef1f5; }
    .shot img { display: block; width: 100%; height: auto; }
    .ann { position: absolute; transform: translate(-50%, -50%); border: 3px solid var(--color); box-shadow: 0 0 0 4px color-mix(in srgb, var(--color) 20%, transparent); }
    .ann.point { width: 42px; height: 42px; border-radius: 50%; }
    .ann.rect { transform: none; border-radius: 6px; }
    .label { position: absolute; left: calc(100% + 8px); top: -8px; min-width: 120px; padding: 6px 8px; border-radius: 6px; background: var(--color); color: white; font-size: 13px; font-weight: 650; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(project.title)}</h1>
${sections}
  </main>
</body>
</html>
`;
}

function renderHtmlStep(step: Step, index: number): string {
  const annotations = step.annotations
    .filter((annotation) => !annotation.hidden)
    .map((annotation) => {
      const color = escapeHtml(annotation.style.color);
      if (annotation.target.kind === "point") {
        return `<div class="ann point" style="--color:${color};left:${annotation.target.x * 100}%;top:${annotation.target.y * 100}%"><span class="label">${escapeHtml(annotation.label)}</span></div>`;
      }
      return `<div class="ann rect" style="--color:${color};left:${annotation.target.x * 100}%;top:${annotation.target.y * 100}%;width:${annotation.target.width * 100}%;height:${annotation.target.height * 100}%"><span class="label">${escapeHtml(annotation.label)}</span></div>`;
    })
    .join("");

  return `    <article>
      <h2>${index}. ${escapeHtml(step.title)}</h2>
      ${step.description ? `<p>${escapeHtml(step.description)}</p>` : ""}
      <div class="shot">
        <img src="../${escapeHtml(step.screenshot.path)}" alt="${escapeHtml(step.title)}">
        ${annotations}
      </div>
    </article>`;
}

function createExportWarnings(steps: Step[]): string[] {
  const sensitiveCount = steps.filter((step) => step.sensitive && !step.hidden).length;
  return sensitiveCount > 0
    ? [`${sensitiveCount} sensitive step${sensitiveCount === 1 ? "" : "s"} included in export.`]
    : [];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeMarkdownAlt(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}
