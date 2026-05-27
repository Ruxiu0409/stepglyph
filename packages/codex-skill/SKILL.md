---
name: stepglyph
description: Use when the user asks Codex to record a Computer Use workflow as an editable visual guide.
---

# Stepglyph Recording Skill

Stepglyph records explicit documentation steps from the current Codex session.
It does not run a background screen recorder. It only captures a screenshot when
you call the local Stepglyph recorder.

## Before Recording

1. Confirm the user wants Stepglyph recording for this task.
2. Make sure the local Stepglyph service is running.
3. Start a session:

```http
POST http://127.0.0.1:4317/api/sessions/start
Content-Type: application/json

{
  "title": "Short user-facing guide title"
}
```

Keep the returned `sessionId`.

## When To Capture

Call `capture` only after meaningful documentation moments:

- A navigation reaches the screen the user needs to see.
- A click opens an important page, menu, modal, or state.
- A form step is complete, with typed values summarized or redacted.
- A visible confirmation, error, toast, or result appears.
- The user explicitly asks for a checkpoint.

Do not capture every screen. Do not run a timer. Do not save passwords, tokens,
credit cards, private messages, or unrelated sensitive content.

## Capture Payload

```http
POST http://127.0.0.1:4317/api/sessions/{sessionId}/capture
Content-Type: application/json

{
  "action": "click",
  "title": "Open account settings",
  "description": "Select account settings from the sidebar.",
  "screenshot": {
    "kind": "png-base64",
    "data": "<base64-png>",
    "width": 1440,
    "height": 900,
    "deviceScaleFactor": 1
  },
  "target": {
    "kind": "point",
    "x": 0.18,
    "y": 0.42
  },
  "app": "Browser",
  "url": "https://example.com/settings",
  "sensitive": false
}
```

Use normalized coordinates from `0` to `1` when a click point or target region
is available.

## Sensitive Steps

If the screenshot may contain private information, set `"sensitive": true`.
Summarize typed values instead of storing raw input. For example, write
`"Entered email address"` instead of the actual email address.

## Finish

Before your final response, finish the session:

```http
POST http://127.0.0.1:4317/api/sessions/{sessionId}/finish
Content-Type: application/json

{}
```

Report the returned Studio URL or project path to the user.
