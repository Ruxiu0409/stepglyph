# Stepglyph v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v0.1 vertical slice: Codex-triggered explicit capture, local recorder service, editable Studio, exports, docs, and a sample project.

**Architecture:** Use a TypeScript npm workspace with focused packages. `@stepglyph/core` owns schemas, project storage, and exporters; `@stepglyph/recorder-server` exposes localhost APIs and serves the Studio build; `apps/studio` is a Vite React app that edits projects through the API; `packages/codex-skill` contains the Codex-facing skill and setup docs.

**Tech Stack:** TypeScript, Node.js, Express, Zod, React, Vite, Vitest, Testing Library, npm workspaces.

---

## File Structure

- Create `package.json`: npm workspace scripts for build, test, dev, and typecheck.
- Create `tsconfig.base.json`: shared strict TypeScript config.
- Create `vitest.config.ts`: workspace test config.
- Create `packages/core/src/schema.ts`: Zod schemas and exported types for projects, steps, annotations, screenshots, captures, and exports.
- Create `packages/core/src/storage.ts`: local project create/load/save/capture asset helpers.
- Create `packages/core/src/exporters.ts`: Markdown, HTML, and JSON export functions.
- Create `packages/core/src/index.ts`: core public API.
- Create `packages/recorder-server/src/server.ts`: Express app factory, API routes, static Studio serving.
- Create `packages/recorder-server/src/index.ts`: package exports.
- Create `packages/cli/src/index.ts`: `stepglyph dev` entrypoint for local service and Studio.
- Create `apps/studio/src/App.tsx`: Studio shell and editing workflow.
- Create `apps/studio/src/api.ts`: Studio API client.
- Create `apps/studio/src/main.tsx`: React entrypoint.
- Create `apps/studio/src/styles.css`: focused app styling.
- Create `packages/codex-skill/SKILL.md`: Codex instructions for explicit capture.
- Create `docs/privacy.md`, `docs/data-format.md`, `docs/codex-skill.md`, `README.md`: public docs.
- Create `fixtures/sample-project`: sample project with tiny PNG screenshots.

## Task 1: Workspace Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/core/package.json`
- Create: `packages/recorder-server/package.json`
- Create: `packages/cli/package.json`
- Create: `apps/studio/package.json`

- [ ] **Step 1: Add workspace manifests**

Create a root npm workspace with scripts:

```json
{
  "name": "stepglyph",
  "version": "0.1.0",
  "private": true,
  "description": "Turn Codex Computer Use sessions into editable visual guides.",
  "license": "MIT",
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "dev": "npm run dev -w @stepglyph/cli",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.base.json --noEmit"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  },
  "dependencies": {
    "express": "^5.0.1",
    "nanoid": "^5.0.9",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.1"
  }
}
```

- [ ] **Step 2: Add TypeScript and test config**

Use strict TypeScript with DOM support for Studio and Node support for packages.

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` and `node_modules` are created.

- [ ] **Step 4: Verify empty workspace scripts**

Run: `npm run typecheck`

Expected: command succeeds after source files are added in later tasks.

## Task 2: Core Schemas And Storage

**Files:**
- Create: `packages/core/src/schema.ts`
- Create: `packages/core/src/storage.ts`
- Create: `packages/core/src/index.ts`
- Test: `packages/core/src/schema.test.ts`
- Test: `packages/core/src/storage.test.ts`

- [ ] **Step 1: Write failing schema tests**

Cover valid project parsing, normalized coordinate rejection outside `0..1`, and explicit capture payload parsing.

- [ ] **Step 2: Implement Zod schemas**

Define `Project`, `Step`, `Annotation`, `Screenshot`, `StepglyphCaptureEvent`, and helpers for point and rect targets.

- [ ] **Step 3: Write failing storage tests**

Test `createProject`, `appendCapture`, `loadProject`, `saveSteps`, and screenshot file creation.

- [ ] **Step 4: Implement storage**

Store `project.json`, `steps.json`, and PNG assets under a project directory. Decode base64 PNG screenshots and create a default annotation from `target`.

- [ ] **Step 5: Run core tests**

Run: `npm test -- packages/core`

Expected: schema and storage tests pass.

## Task 3: Exporters

**Files:**
- Create: `packages/core/src/exporters.ts`
- Test: `packages/core/src/exporters.test.ts`

- [ ] **Step 1: Write failing exporter tests**

Cover Markdown sections, standalone HTML escaping, JSON export fidelity, hidden step exclusion, and sensitive step warnings.

- [ ] **Step 2: Implement Markdown export**

Generate `exports/guide.md` using step titles, descriptions, and screenshot paths.

- [ ] **Step 3: Implement HTML export**

Generate `exports/guide.html` as a standalone document with rendered screenshot/annotation overlays.

- [ ] **Step 4: Implement JSON export**

Generate `exports/project.json` and `exports/steps.json`.

- [ ] **Step 5: Run exporter tests**

Run: `npm test -- packages/core/src/exporters.test.ts`

Expected: exporter tests pass.

## Task 4: Local Recorder Server

**Files:**
- Create: `packages/recorder-server/src/server.ts`
- Create: `packages/recorder-server/src/index.ts`
- Test: `packages/recorder-server/src/server.test.ts`

- [ ] **Step 1: Write failing API tests**

Cover `GET /api/health`, `POST /api/sessions/start`, `POST /api/sessions/:id/capture`, `POST /api/sessions/:id/finish`, `GET /api/projects/:id`, `PUT /api/projects/:id/steps`, and `POST /api/projects/:id/export`.

- [ ] **Step 2: Implement Express app factory**

Create `createRecorderServer({ workspaceDir, studioDistDir })` and keep active sessions in memory.

- [ ] **Step 3: Implement routes**

Use core storage/export functions, return validation errors as JSON, and reject capture when session is missing or finished.

- [ ] **Step 4: Run server tests**

Run: `npm test -- packages/recorder-server`

Expected: server tests pass.

## Task 5: Studio App

**Files:**
- Create: `apps/studio/index.html`
- Create: `apps/studio/src/main.tsx`
- Create: `apps/studio/src/App.tsx`
- Create: `apps/studio/src/api.ts`
- Create: `apps/studio/src/styles.css`
- Test: `apps/studio/src/App.test.tsx`

- [ ] **Step 1: Write failing Studio tests**

Use a mocked API client to verify project loading, step selection, title editing, description editing, marker dragging, hidden/sensitive toggles, reordering, and export button calls.

- [ ] **Step 2: Implement API client**

Wrap the recorder server endpoints with typed functions.

- [ ] **Step 3: Implement Studio shell**

Create a three-panel editor: step list, screenshot canvas with editable annotations, and inspector/export panel.

- [ ] **Step 4: Implement editing actions**

Persist title, description, hidden, sensitive, annotation label/style, annotation position, delete, duplicate, and reorder changes through `PUT /api/projects/:id/steps`.

- [ ] **Step 5: Run Studio tests and build**

Run: `npm test -- apps/studio`

Run: `npm run build -w @stepglyph/studio`

Expected: tests and Vite build pass.

## Task 6: CLI Entrypoint

**Files:**
- Create: `packages/cli/src/index.ts`
- Test: `packages/cli/src/index.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Cover argument parsing for `stepglyph dev --port 4317 --workspace .stepglyph` and helpful unknown command output.

- [ ] **Step 2: Implement `stepglyph dev`**

Start the recorder server on localhost, print the Studio URL, and ensure `.stepglyph/projects` exists.

- [ ] **Step 3: Run CLI tests**

Run: `npm test -- packages/cli`

Expected: CLI tests pass.

## Task 7: Codex Skill And Public Docs

**Files:**
- Create: `packages/codex-skill/SKILL.md`
- Create: `README.md`
- Create: `docs/privacy.md`
- Create: `docs/data-format.md`
- Create: `docs/codex-skill.md`

- [ ] **Step 1: Write Codex skill**

Include explicit `start`, `capture`, and `finish` behavior; meaningful capture guidance; sensitive data rules; and "no background recording" language.

- [ ] **Step 2: Write README**

Explain what Stepglyph is, the v0.1 flow, install/dev commands, privacy model, and current limitations.

- [ ] **Step 3: Write docs**

Document privacy, data format, and Codex skill setup with concrete JSON examples.

- [ ] **Step 4: Verify docs**

Run: `rg -n "background|continuous|timer|upload|capture" README.md docs packages/codex-skill`

Expected: privacy language is visible in README, docs, and skill.

## Task 8: Fixture And End-To-End Verification

**Files:**
- Create: `fixtures/sample-project/project.json`
- Create: `fixtures/sample-project/steps.json`
- Create: `fixtures/sample-project/captures/step-001.png`
- Create: `fixtures/sample-project/captures/step-002.png`
- Test: `tests/e2e/recording-flow.test.ts`

- [ ] **Step 1: Add sample project**

Use tiny valid PNG fixtures and two steps with editable annotations.

- [ ] **Step 2: Write e2e test**

Start the server in-process, create a session, capture two explicit steps, finish it, export Markdown/HTML, and assert files exist.

- [ ] **Step 3: Run full verification**

Run: `npm run typecheck`

Run: `npm test`

Run: `npm run build`

Expected: all commands pass.

- [ ] **Step 4: Start local dev server**

Run: `npm run dev`

Expected: local Studio URL is printed and the server remains running for manual review.

## Self-Review Notes

- Spec coverage: The plan covers the Codex skill, explicit-only recorder, local service, Studio editing, Markdown/HTML/JSON exports, privacy docs, and sample project.
- Deferred intentionally: Direct Codex internal hooks, transparent interception, background screen recording, cloud sync, and direct desktop control remain out of scope for v0.1.
- Consistency check: The project uses `Project`, `Step`, `Annotation`, `Screenshot`, and `StepglyphCaptureEvent` consistently across core, server, Studio, docs, and fixture tasks.
