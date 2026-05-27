import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import {
  Annotation,
  Project,
  ProjectSchema,
  ProjectWithSteps,
  StepglyphCaptureEvent,
  StepglyphCaptureEventInput,
  StepglyphCaptureEventSchema,
  Step,
  StepSchema
} from "./schema.js";

export type CreateProjectInput = {
  title: string;
  workspaceDir: string;
  source?: Project["source"];
  settings?: Partial<Project["settings"]>;
};

export type CreatedProject = {
  project: Project;
  projectDir: string;
};

const PROJECT_FILE = "project.json";
const STEPS_FILE = "steps.json";

export async function createProject(input: CreateProjectInput): Promise<CreatedProject> {
  const now = new Date().toISOString();
  const id = `proj_${timestampSlug(now)}_${nanoid(6)}`;
  const projectDir = path.join(input.workspaceDir, "projects", id);
  const project: Project = {
    schemaVersion: "1.0.0",
    id,
    title: input.title,
    createdAt: now,
    updatedAt: now,
    source: input.source ?? { adapter: "codex-skill", agent: "codex" },
    settings: {
      redactInputs: input.settings?.redactInputs ?? true,
      theme: input.settings?.theme ?? "default"
    }
  };

  await mkdir(path.join(projectDir, "captures"), { recursive: true });
  await mkdir(path.join(projectDir, "exports"), { recursive: true });
  await writeJson(path.join(projectDir, PROJECT_FILE), project);
  await writeJson(path.join(projectDir, STEPS_FILE), []);

  return { project, projectDir };
}

export async function loadProject(projectDir: string): Promise<ProjectWithSteps> {
  const project = ProjectSchema.parse(await readJson(path.join(projectDir, PROJECT_FILE)));
  const rawSteps = await readJson(path.join(projectDir, STEPS_FILE));
  const steps = StepSchema.array().parse(rawSteps);
  return { project, steps };
}

export async function saveSteps(projectDir: string, steps: Step[]): Promise<ProjectWithSteps> {
  const parsedSteps = StepSchema.array().parse(
    steps.map((step, index) => ({ ...step, index: index + 1 }))
  );
  const { project } = await loadProject(projectDir);
  const updatedProject = { ...project, updatedAt: new Date().toISOString() };

  await writeJson(path.join(projectDir, PROJECT_FILE), updatedProject);
  await writeJson(path.join(projectDir, STEPS_FILE), parsedSteps);

  return { project: updatedProject, steps: parsedSteps };
}

export async function appendCapture(
  projectDir: string,
  input: StepglyphCaptureEventInput
): Promise<Step> {
  const event = StepglyphCaptureEventSchema.parse(input);
  const { steps } = await loadProject(projectDir);
  const nextIndex = steps.length + 1;
  const screenshotPath = `captures/step-${String(nextIndex).padStart(3, "0")}.png`;
  const absoluteScreenshotPath = path.join(projectDir, screenshotPath);

  if (event.screenshot.kind === "png-base64") {
    await writeFile(absoluteScreenshotPath, decodePngBase64(event.screenshot.data));
  } else {
    await copyFile(event.screenshot.path, absoluteScreenshotPath);
  }

  const annotations = event.target ? [createAnnotation(event)] : [];
  const step: Step = {
    id: `step_${String(nextIndex).padStart(3, "0")}`,
    index: nextIndex,
    title: event.title,
    description: event.description,
    hidden: false,
    sensitive: event.sensitive,
    action: {
      type: event.action,
      timestamp: new Date().toISOString(),
      app: event.app,
      url: event.url,
      metadata: {
        ...event.metadata,
        redactions: event.redactions
      }
    },
    screenshot: {
      path: screenshotPath,
      width: event.screenshot.width,
      height: event.screenshot.height,
      deviceScaleFactor: event.screenshot.deviceScaleFactor
    },
    annotations
  };

  const saved = await saveSteps(projectDir, [...steps, step]);
  return saved.steps[saved.steps.length - 1];
}

export async function resolveProjectDir(workspaceDir: string, projectId: string): Promise<string> {
  return path.join(workspaceDir, "projects", projectId);
}

export function getProjectFiles(projectDir: string) {
  return {
    projectJson: path.join(projectDir, PROJECT_FILE),
    stepsJson: path.join(projectDir, STEPS_FILE),
    exportsDir: path.join(projectDir, "exports")
  };
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createAnnotation(event: StepglyphCaptureEvent): Annotation {
  const isPoint = event.target?.kind === "point";
  return {
    id: `ann_${nanoid(8)}`,
    type: isPoint && event.action === "click" ? "click-ring" : "box",
    target: event.target!,
    label: event.title,
    style: {
      color: "#2563eb",
      size: "medium",
      labelPosition: "top-right"
    },
    editable: true,
    hidden: false
  };
}

function decodePngBase64(data: string): Buffer {
  const base64 = data.includes(",") ? data.split(",").at(-1)! : data;
  return Buffer.from(base64, "base64");
}

function timestampSlug(iso: string): string {
  return iso.replaceAll("-", "").replaceAll(":", "").replace(/\..+$/, "").replace("T", "_");
}
