# Stepglyph Open Source Project Specification

Date: 2026-05-27
Status: Revised specification ready for user review
Working repo name: `stepglyph`
Tagline: Turn Codex Computer Use sessions into editable visual guides.

## 1. Summary

Stepglyph is a local-first open source recording and editing studio for Codex
Computer Use workflows. It lets a user stay inside their normal Codex session,
ask Codex to "use stepglyph", and have Codex intentionally save selected steps
from the session as a structured visual guide.

Stepglyph should not replace Codex, reimplement a Codex chat interface, or
silently monitor the user's screen. Instead, it provides a Codex skill and a
local recorder service that Codex can call at meaningful moments:

1. `start` begins a recording session.
2. `capture` saves one explicit step with screenshot, action summary, and
   optional coordinates or target region.
3. `finish` closes the session and opens or links to the Studio.

After recording, the user edits the result in a local web Studio. The Studio
loads the saved project, displays the captured steps, lets the user fix text and
annotations, and exports the final guide as Markdown, HTML, JSON, and later
annotated PNG images.

The v0.1 focus is not "record everything". The focus is trusted, intentional
capture from the user's existing Codex workflow.

## 2. Problem

Codex can perform useful Computer Use tasks, but those tasks often disappear
after the final answer. Users may want documentation, training material, bug
reproduction steps, customer support articles, or a handoff guide, but they
must manually reconstruct the process from memory.

A separate Stepglyph chat UI would create a weaker experience because the user
would lose their normal Codex session, prompt habits, active context, and
available tools. A background screen recorder would create privacy concerns and
would still miss the structured meaning behind each action.

Stepglyph fills the gap by letting Codex intentionally hand off useful moments
to a local recorder. Codex remains the agent. Stepglyph becomes the documentation
layer.

## 3. Product Direction

Stepglyph v0.1 should be built around this user flow:

1. The user installs Stepglyph from GitHub.
2. The user starts the local Stepglyph recorder and Studio service.
3. The user opens their normal Codex session.
4. The user asks Codex to use Stepglyph for the current task.
5. Codex follows the Stepglyph skill instructions.
6. Codex calls the local recorder only at meaningful documentation moments.
7. Stepglyph stores screenshots, action summaries, optional targets, and
   metadata as a project.
8. The user opens the local Studio to review, edit, and export the guide.

This means the first public version should include a complete vertical slice:

- Codex skill instructions.
- Local recorder service.
- Project data model and storage.
- Studio UI for review and editing.
- Markdown, HTML, and JSON export.
- Documentation explaining setup, privacy behavior, and skill usage.

## 4. Goals

- Let users record Codex Computer Use sessions without leaving Codex.
- Capture only explicit steps that Codex sends to Stepglyph.
- Avoid background screen recording and hidden monitoring.
- Save raw screenshots without permanently drawing annotations onto them.
- Create editable annotations for clicks, target regions, callouts, result
  states, and error states.
- Store annotation positions in normalized coordinates so they remain accurate
  after resizing.
- Provide a local Studio where users can edit step text, annotations, step
  order, and export settings.
- Export guides to formats that are easy to publish, commit, or share.
- Keep all project data local by default.
- Design the recorder core so future adapters can support Playwright,
  browser-use, Computer Use APIs, or other agent runtimes.

## 5. Non-Goals For v0.1

- Stepglyph will not reimplement the Codex chat UI.
- Stepglyph will not transparently intercept private Codex internals.
- Stepglyph will not continuously record the user's screen.
- Stepglyph will not use timer-based screenshot capture by default.
- Stepglyph will not require a cloud backend.
- Stepglyph will not require an LLM for editing or exporting.
- Stepglyph will not directly control the user's computer.
- Stepglyph will not try to infer every action from pixels alone.
- Stepglyph will not replace full video recording tools.

## 6. Primary Users

### 6.1 Codex Computer Use Users

Users who ask Codex to operate browser or desktop applications want a clean
record of what happened. They care about staying in their existing Codex
session and receiving an editable guide at the end.

### 6.2 Documentation Authors

Users who dislike writing SOPs want Codex to perform a process and then receive
a guide they can lightly edit. They care about a polished Studio, quick fixes,
and export quality.

### 6.3 QA And Support Teams

Teams need reproducible visual steps for bugs, support articles, and internal
training. They care about consistent formatting, editable annotations, privacy
warnings, and shareable artifacts.

### 6.4 Open Source Contributors

Contributors need clear package boundaries, documented schemas, a simple local
development flow, and a path for future adapters.

## 7. Core User Stories

1. As a user, I can ask Codex to use Stepglyph in my existing Codex session.
2. As a user, I can start a Stepglyph recording session for one task.
3. As Codex, I can save an explicit step with screenshot, description, and
   optional target coordinates.
4. As a user, I can trust that Stepglyph does not keep recording my screen in
   the background.
5. As a user, I can open the generated Studio project and see each captured
   step.
6. As a user, I can edit a step title and description.
7. As a user, I can drag a click marker or target annotation to a better
   location.
8. As a user, I can edit annotation labels and styles.
9. As a user, I can reorder, duplicate, hide, or delete steps.
10. As a user, I can export a polished Markdown or HTML guide.
11. As a user, I can inspect the raw project JSON for transparency.
12. As a future adapter author, I can integrate another automation runtime by
    sending explicit recorder events.

## 8. Recommended Repository Structure

```txt
stepglyph/
  apps/
    studio/                    # Local web editor for reviewing captures
  packages/
    core/                      # Data model, schemas, sessions, storage
    recorder-server/           # Local HTTP API used by Codex/tools
    codex-skill/               # Codex skill files and install docs
    renderer/                  # Annotation rendering primitives
    exporters/                 # Markdown, HTML, JSON, annotated PNG later
    cli/                       # Developer entrypoint for starting services
  examples/
    codex-computer-use-flow/
    sample-project/
  docs/
    architecture.md
    codex-skill.md
    data-format.md
    privacy.md
    adapter-authoring.md
  fixtures/
    sample-project/
```

The CLI package is not the main user experience. It is a practical developer
entrypoint for starting the local recorder and Studio during v0.1. The product
experience remains Codex plus the local Studio.

## 9. System Architecture

Stepglyph should be divided into small packages with stable interfaces.

### 9.1 `@stepglyph/core`

Responsibilities:

- Define canonical project, step, screenshot, annotation, and export schemas.
- Create and manage recording sessions.
- Store project files on disk.
- Normalize and denormalize coordinates.
- Track privacy metadata such as sensitive steps and redacted values.
- Provide asset path utilities.
- Avoid dependencies on Codex, React, or any specific automation runtime.

### 9.2 `@stepglyph/recorder-server`

Responsibilities:

- Run a local HTTP server.
- Expose explicit recording endpoints.
- Validate incoming events.
- Save screenshots or screenshot references.
- Write project data through `@stepglyph/core`.
- Return Studio project URLs and export status.
- Reject capture calls when no session is active.

Proposed local endpoints:

```txt
POST /api/sessions/start
POST /api/sessions/:id/capture
POST /api/sessions/:id/finish
GET  /api/projects/:id
PUT  /api/projects/:id/steps
POST /api/projects/:id/export
GET  /api/health
```

The server should bind to localhost by default.

### 9.3 `@stepglyph/codex-skill`

Responsibilities:

- Provide a Codex skill that explains when and how to use Stepglyph.
- Tell Codex to start a session before the documented task begins.
- Tell Codex to capture only meaningful documentation steps.
- Tell Codex to avoid capturing secrets, passwords, tokens, private messages,
  or unnecessary intermediate screens.
- Tell Codex to finish the session and report the Studio URL.
- Include examples of high-quality capture labels and descriptions.

The skill must make the privacy model explicit: Stepglyph captures only when
Codex calls the recorder.

### 9.4 `@stepglyph/renderer`

Responsibilities:

- Render annotations over screenshots in Studio.
- Render annotations into export outputs.
- Provide deterministic layout for labels, rings, boxes, arrows, badges, and
  callouts.
- Keep rendering independent from Studio state management.

### 9.5 `@stepglyph/exporters`

Responsibilities:

- Export `guide.md`.
- Export standalone `guide.html`.
- Export `project.json` and `steps.json`.
- Later export annotated PNG images.
- Ensure raw screenshots remain unmodified.

### 9.6 `apps/studio`

Responsibilities:

- Load a Stepglyph project from the local recorder service.
- Show step list, screenshot canvas, annotation controls, and export panel.
- Allow users to edit step text and annotation properties.
- Allow users to reorder, duplicate, hide, and delete steps.
- Save edits through the local recorder service.
- Preview export output.

The Studio should feel like a focused documentation editor, not a marketing
page. The first screen should open directly into the project editing experience.

## 10. Recording Model

Stepglyph records workflows as sessions. A session contains ordered steps. Each
step may have a screenshot, action event, annotation, generated text, and export
settings.

The v0.1 capture model is explicit only:

```ts
await stepglyph.capture({
  action: "click",
  title: "Open account settings",
  description: "Select the account settings item from the sidebar.",
  target: { kind: "point", x: 0.18, y: 0.42 },
  screenshot: {
    kind: "png-base64",
    data: "..."
  }
});
```

There is no background interval recorder in v0.1. There is no automatic screen
polling. Every saved screenshot must correspond to an explicit recorder event.

## 11. Capture Quality Guidelines

The Codex skill should guide Codex to capture:

- After a navigation reaches the screen the user needs to see.
- After a click opens an important menu, modal, page, or state.
- After a form is completed, without storing raw sensitive values.
- After a visible result, confirmation, error, toast, or validation message.
- At explicit checkpoints requested by the user.
- Before and after states when the change matters.

The Codex skill should guide Codex to skip:

- Rapid duplicate screens.
- Screens with passwords, tokens, credit cards, private chats, or unrelated
  sensitive information.
- Low-value waits or loading states unless they explain a problem.
- Internal screens that the user asks not to capture.

## 12. Annotation Model

Annotations must be structured data, not pixels baked into the original
screenshot. This is required for editing.

Coordinates should be normalized from 0 to 1 relative to the screenshot size.
This preserves position across display scaling and export sizes.

Supported annotation types for v0.1:

- `click-ring`: ring around click position.
- `box`: rectangular highlight around an element or region.
- `callout`: text label anchored to a point or region.
- `badge`: numbered marker.
- `spotlight`: dim background with a highlighted target area.

Post-v0.1 annotation types:

- `arrow`
- `cursor`
- `freeform-blur`
- `auto-redaction`

Example:

```json
{
  "id": "ann_003",
  "type": "click-ring",
  "target": {
    "kind": "point",
    "x": 0.624,
    "y": 0.413
  },
  "label": "Click Sign in",
  "style": {
    "color": "#2563eb",
    "size": "medium",
    "labelPosition": "top-right"
  },
  "editable": true
}
```

## 13. Data Format

Each recording output should be a self-contained project directory.

```txt
stepglyph-output/
  project.json
  steps.json
  captures/
    step-001.png
    step-002.png
  exports/
    guide.md
    guide.html
    annotated/
      step-001.png
      step-002.png
```

### 13.1 `project.json`

```json
{
  "schemaVersion": "1.0.0",
  "id": "proj_2026_05_27_001",
  "title": "Account settings workflow",
  "createdAt": "2026-05-27T10:00:00.000Z",
  "updatedAt": "2026-05-27T10:03:00.000Z",
  "source": {
    "adapter": "codex-skill",
    "agent": "codex"
  },
  "settings": {
    "redactInputs": true,
    "theme": "default"
  }
}
```

### 13.2 `steps.json`

```json
[
  {
    "id": "step_001",
    "index": 1,
    "title": "Open account settings",
    "description": "Select account settings from the sidebar.",
    "hidden": false,
    "sensitive": false,
    "action": {
      "type": "click",
      "timestamp": "2026-05-27T10:00:20.000Z",
      "app": "Browser",
      "url": "https://example.com/settings"
    },
    "screenshot": {
      "path": "captures/step-001.png",
      "width": 1440,
      "height": 900,
      "deviceScaleFactor": 1
    },
    "annotations": [
      {
        "id": "ann_001",
        "type": "click-ring",
        "target": {
          "kind": "point",
          "x": 0.18,
          "y": 0.42
        },
        "label": "Open account settings",
        "style": {
          "color": "#2563eb",
          "size": "medium",
          "labelPosition": "top-right"
        },
        "editable": true
      }
    ]
  }
]
```

## 14. Studio User Experience

The Studio is the main visible product surface.

### 14.1 Layout

- Left sidebar: ordered step list with thumbnails and step titles.
- Center: screenshot canvas with editable annotations.
- Right panel: selected step and annotation properties.
- Top toolbar: undo, redo, zoom, save status, export, validation status.

### 14.2 Step Editing

Users can:

- Rename a step.
- Edit the description.
- Hide a step from export.
- Mark a step as sensitive.
- Delete a step.
- Duplicate a step.
- Reorder steps by drag and drop.

### 14.3 Annotation Editing

Users can:

- Drag a marker.
- Resize box or spotlight annotations.
- Change annotation type.
- Edit label text.
- Change color.
- Change label placement.
- Add additional markers.
- Delete markers.
- Toggle whether a marker is included in export.

### 14.4 Export Preview

Users should be able to preview the final guide before exporting. The preview
should show the rendered guide layout for HTML and a Markdown-oriented preview
for Markdown export.

## 15. Export Behavior

### 15.1 Markdown Export

Markdown should prioritize portability.

```md
# Account settings workflow

## 1. Open account settings

Select account settings from the sidebar.

![Open account settings](captures/step-001.png)
```

### 15.2 HTML Export

HTML should be a polished standalone guide with:

- Title and metadata.
- Ordered steps.
- Responsive screenshots.
- Rendered annotations.
- Optional table of contents.
- No dependency on the Studio runtime.

### 15.3 JSON Export

JSON should preserve full project fidelity for other tools.

### 15.4 Annotated PNG Export

Annotated PNG export is valuable but can be treated as a v0.1 stretch goal if
Studio, Markdown, and HTML need to land first. When implemented, annotated PNG
files must be generated from raw screenshots plus annotation data. Raw
screenshots must remain untouched.

## 16. Local Recorder API Contract

Minimal capture event:

```ts
type StepglyphCaptureEvent = {
  action: "navigate" | "click" | "type" | "press" | "wait" | "result" | "error";
  title: string;
  description?: string;
  screenshot: ScreenshotInput;
  target?: PointTarget | RectTarget;
  app?: string;
  url?: string;
  redactions?: RedactionMetadata[];
  sensitive?: boolean;
  metadata?: Record<string, unknown>;
};
```

The recorder should accept screenshots as either:

- Base64 PNG data.
- Multipart upload.
- Local file path when explicitly allowed.

The recorder should return:

- Step ID.
- Project ID.
- Relative screenshot path.
- Validation warnings.

## 17. Codex Skill Behavior

The Codex skill is a central part of the product.

The skill should instruct Codex to:

1. Confirm the user wants Stepglyph recording for the current task.
2. Start a recorder session.
3. Capture only meaningful documentation steps.
4. Summarize typed sensitive values instead of saving raw values.
5. Prefer concise, user-facing step titles.
6. Include target coordinates or regions when available.
7. Mark sensitive steps when privacy risk is present.
8. Finish the recorder session before final response.
9. Report the Studio URL or project path.

The skill should not instruct Codex to:

- Capture every screen.
- Run a background recorder.
- Store passwords, tokens, or private data.
- Upload screenshots to a cloud service.

## 18. Privacy And Security

Stepglyph should be trustworthy by default.

Required privacy controls:

- No background screen recording in v0.1.
- No automatic timer-based screenshots.
- Capture only through explicit recorder calls.
- Store all project files locally by default.
- Bind the local recorder server to localhost by default.
- Redact typed values by default.
- Allow Codex or the user to mark steps as sensitive.
- Warn before exporting sensitive steps.
- Do not upload screenshots unless a future cloud or LLM integration is
  explicitly enabled.
- Document that screenshots may contain secrets.

Potential future feature:

- OCR-based suggestions for emails, tokens, passwords, and credit card patterns.

## 19. Accessibility

The Studio should support:

- Keyboard navigation through steps.
- Keyboard movement of selected annotations.
- Sufficient contrast for annotation controls.
- Alt text fields for exported images.
- Screen-reader labels for editor controls.

Exports should produce semantic headings and ordered sections.

## 20. Testing Strategy

### 20.1 Core Tests

- Schema validation for project files.
- Coordinate normalization and denormalization.
- Step ordering.
- Redaction metadata handling.
- Sensitive step export warnings.

### 20.2 Recorder Server Tests

- Start creates a project.
- Capture writes screenshot and step metadata.
- Capture fails when no session is active.
- Finish closes the session and returns project info.
- Invalid payloads return useful validation errors.

### 20.3 Codex Skill Tests

- Skill examples produce valid recorder payloads.
- Skill instructions avoid background recording.
- Skill instructions emphasize redaction and meaningful capture.

### 20.4 Renderer Tests

- Click rings render at expected positions.
- Box and spotlight annotations scale correctly.
- Raw screenshots are not mutated.

### 20.5 Studio Tests

- Load a fixture project.
- Drag a marker and persist updated coordinates.
- Edit a label and persist the result.
- Reorder steps and persist order.
- Export Markdown and HTML from edited state.

### 20.6 End-To-End Tests

- Start recorder service.
- Create a fixture Codex-like recording session by API.
- Generate a Stepglyph project.
- Open Studio against the generated project.
- Edit one marker.
- Export HTML and Markdown.
- Validate generated files.

## 21. Acceptance Criteria For v0.1

v0.1 is complete when:

1. A user can start the local recorder and Studio service.
2. A Codex skill file exists and documents how Codex should use Stepglyph.
3. The local recorder can start, capture, and finish a session.
4. Capture is explicit only; there is no background screen recorder.
5. A capture event can save a screenshot and step metadata.
6. Click or target data automatically creates editable annotations.
7. Annotation positions are stored as normalized coordinates.
8. Studio can open the generated project.
9. Studio can edit step title and description.
10. Studio can drag a marker and save the new position.
11. Studio can change annotation label text and style.
12. Studio can reorder steps.
13. Exporter can generate Markdown.
14. Exporter can generate standalone HTML.
15. JSON project files are documented.
16. Raw screenshots remain unmodified after export.
17. Privacy documentation explains explicit capture and non-recording behavior.

## 22. Roadmap

### Phase 1: Foundations

- Create monorepo.
- Implement core schemas.
- Implement local project storage.
- Implement screenshot asset management.
- Implement Markdown and JSON export.

### Phase 2: Local Recorder Service

- Implement start, capture, finish endpoints.
- Validate payloads.
- Save screenshots and metadata.
- Return Studio links and warnings.

### Phase 3: Codex Skill

- Write skill instructions.
- Provide install documentation.
- Add sample prompts and sample recorder payloads.
- Add privacy guidance.

### Phase 4: Studio

- Load project files through local service.
- Render screenshots and annotations.
- Edit step text.
- Drag and edit annotations.
- Reorder steps.
- Save project changes.

### Phase 5: Export Quality

- Generate standalone HTML.
- Add export preview.
- Add validation warnings.
- Add annotated PNG export if time allows.

### Phase 6: Adapter Ecosystem

- Add Playwright adapter.
- Add browser-use style adapter.
- Add direct Computer Use API examples when appropriate public hooks exist.
- Publish adapter authoring guide.

## 23. Open Source Positioning

Suggested short description:

> Stepglyph turns Codex Computer Use sessions into editable visual guides.

Suggested README intro:

> Stepglyph helps Codex document what it does. Ask Codex to use Stepglyph during
> a Computer Use task, and Stepglyph saves explicit screenshots, action
> summaries, and editable annotations into a local Studio project. Review the
> steps, adjust the markers, and export a polished guide as Markdown or HTML.

Recommended license:

- MIT for maximum adoption, unless future commercial constraints require Apache
  2.0.

Recommended package namespace:

- `@stepglyph/core`
- `@stepglyph/recorder-server`
- `@stepglyph/codex-skill`
- `@stepglyph/renderer`
- `@stepglyph/exporters`
- `@stepglyph/cli`

## 24. Design Principles

- Codex remains the agent.
- Stepglyph is the documentation layer.
- Capture is explicit, not continuous.
- Raw screenshots stay clean.
- Annotations are always editable data.
- The Studio is the primary visible product surface.
- The recorder core is independent from any specific agent runtime.
- Exports are reproducible from project data.
- Privacy defaults should be conservative.
- The first integrated workflow should match how users already use Codex.

## 25. Risks And Mitigations

### Risk: Codex forgets to capture useful steps

Mitigation: Write clear skill instructions, provide examples, and support manual
checkpoint requests from the user.

### Risk: Capture quality depends on prompt behavior

Mitigation: Keep recorder payloads simple, validate required fields, and make
Studio editing fast enough that users can fix imperfect captures.

### Risk: Users worry Stepglyph records too much

Mitigation: Do not implement background screen recording in v0.1. State this
clearly in the product UI and privacy docs.

### Risk: Sensitive data leaks into exports

Mitigation: Redact typed values by default, support sensitive-step flags, and
warn before exporting sensitive steps.

### Risk: Codex internal hooks are unavailable

Mitigation: Use a Codex skill and local recorder service. Treat future direct
hooks as an enhancement, not a v0.1 requirement.

### Risk: Studio becomes too complex

Mitigation: Keep v0.1 editing focused on step order, text, marker position,
marker type, marker style, and exports.

## 26. Suggested First Public Milestone

The first public milestone should be named:

`v0.1.0 - Codex-Guided Visual Guides`

It should include:

- Core schema.
- Local recorder service.
- Codex skill.
- Studio with editable steps and markers.
- Markdown export.
- HTML export.
- JSON project format.
- Privacy documentation.
- Sample project fixture.

This milestone is a full vertical slice that proves the central promise:
Codex can intentionally save a Computer Use workflow as an editable visual
guide without Stepglyph continuously recording the user's screen.

## 27. Final Product Statement

Stepglyph is a local-first documentation layer for Codex Computer Use. It
captures explicit moments from a Codex session, turns them into editable visual
steps, and exports the result as reusable documentation.

The project should begin with a Codex skill and local recorder service because
that matches the user's real workflow. The defining feature is trust: Stepglyph
records only when asked, keeps screenshots local, and gives the user a Studio
for fast review and correction.
