# Stepglyph

Stepglyph turns Codex Computer Use sessions into editable visual guides.

Ask Codex to use Stepglyph during a task, and Stepglyph saves explicit
screenshots, action summaries, and editable annotations into a local Studio
project. Review the steps, adjust markers, edit labels, and export a polished
guide as Markdown, HTML, or JSON.

## Current v0.1 Flow

1. Start the local recorder and Studio service.
2. Ask Codex to use the Stepglyph skill for the current task.
3. Codex calls `start`, `capture`, and `finish` on the local recorder.
4. Open the Studio URL returned by the recorder.
5. Edit steps and annotations.
6. Export the guide.

Stepglyph does not replace Codex and does not run a background screen recorder.
Capture is explicit only.

## Development

```bash
npm install
npm run build
npm test
npm run dev
```

The dev command starts the local recorder on `127.0.0.1:4317`.

## Packages

- `@stepglyph/core`: schemas, storage, and exports.
- `@stepglyph/recorder-server`: localhost API for explicit capture.
- `@stepglyph/cli`: developer entrypoint for running the local service.
- `@stepglyph/studio`: local web editor.
- `packages/codex-skill`: Codex skill instructions.

## Privacy Model

- No background screen recording.
- No timer-based screenshots.
- No cloud upload by default.
- Screenshots stay local.
- Typed values should be summarized or redacted.
- Sensitive steps can be flagged before export.

See [docs/privacy.md](docs/privacy.md).
