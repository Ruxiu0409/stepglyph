import express, { Express } from "express";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  appendCapture,
  createProject,
  exportProject,
  loadProject,
  resolveProjectDir,
  saveSteps,
  StepSchema,
  StepglyphCaptureEventSchema
} from "@stepglyph/core";

export type RecorderServerOptions = {
  workspaceDir: string;
  studioDistDir?: string;
};

type ActiveSession = {
  id: string;
  projectId: string;
  projectDir: string;
  finished: boolean;
};

export function createRecorderServer(options: RecorderServerOptions): Express {
  const app = express();
  const sessions = new Map<string, ActiveSession>();

  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      captureMode: "explicit",
      backgroundRecording: false
    });
  });

  app.post("/api/sessions/start", async (req, res) => {
    try {
      await mkdir(options.workspaceDir, { recursive: true });
      const created = await createProject({
        workspaceDir: options.workspaceDir,
        title: typeof req.body?.title === "string" && req.body.title.trim()
          ? req.body.title.trim()
          : "Untitled Stepglyph Guide"
      });
      const session: ActiveSession = {
        id: `sess_${created.project.id}`,
        projectId: created.project.id,
        projectDir: created.projectDir,
        finished: false
      };
      sessions.set(session.id, session);
      res.status(201).json({
        sessionId: session.id,
        projectId: session.projectId,
        projectDir: session.projectDir,
        studioUrl: `/studio/${session.projectId}`
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/sessions/:id/capture", async (req, res) => {
    try {
      const session = sessions.get(req.params.id);
      if (!session || session.finished) {
        res.status(404).json({ error: "Recording session is not active." });
        return;
      }

      const event = StepglyphCaptureEventSchema.parse(req.body);
      const step = await appendCapture(session.projectDir, event);
      res.status(201).json({
        projectId: session.projectId,
        step,
        warnings: event.sensitive ? ["This step is marked sensitive."] : []
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/sessions/:id/finish", async (req, res) => {
    try {
      const session = sessions.get(req.params.id);
      if (!session) {
        res.status(404).json({ error: "Recording session was not found." });
        return;
      }

      session.finished = true;
      const project = await loadProject(session.projectDir);
      res.json({
        projectId: session.projectId,
        projectDir: session.projectDir,
        studioUrl: `/studio/${session.projectId}`,
        steps: project.steps.length
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectDir = await resolveProjectDir(options.workspaceDir, req.params.id);
      res.json(await loadProject(projectDir));
    } catch (error) {
      sendError(res, error, 404);
    }
  });

  app.put("/api/projects/:id/steps", async (req, res) => {
    try {
      const projectDir = await resolveProjectDir(options.workspaceDir, req.params.id);
      const steps = StepSchema.array().parse(req.body?.steps);
      res.json(await saveSteps(projectDir, steps));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/projects/:id/export", async (req, res) => {
    try {
      const projectDir = await resolveProjectDir(options.workspaceDir, req.params.id);
      const formats = Array.isArray(req.body?.formats) && req.body.formats.length > 0
        ? req.body.formats
        : ["markdown", "html", "json"];
      res.json(await exportProject(projectDir, formats));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.use("/projects", express.static(path.join(options.workspaceDir, "projects")));

  if (options.studioDistDir) {
    app.use(express.static(options.studioDistDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(options.studioDistDir!, "index.html"));
    });
  }

  return app;
}

function sendError(res: express.Response, error: unknown, status = 400): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(status).json({ error: message });
}
