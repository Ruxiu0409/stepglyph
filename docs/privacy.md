# Privacy

Stepglyph is local-first and explicit-capture only.

## What Stepglyph Does

- Saves screenshots only when Codex calls the recorder's `capture` endpoint.
- Stores projects under the local workspace directory.
- Keeps raw screenshots separate from editable annotations.
- Warns when sensitive steps are included in export.

## What Stepglyph Does Not Do In v0.1

- It does not continuously record the user's screen.
- It does not run timer-based screenshot capture.
- It does not silently monitor Codex internals.
- It does not upload screenshots to a cloud service.
- It does not store passwords, tokens, or private values by design.

## Sensitive Data

Screenshots may still contain private information. Codex should mark risky
screens as sensitive and summarize typed values instead of saving raw values.
Users should review captured steps before exporting.
