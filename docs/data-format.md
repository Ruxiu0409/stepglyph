# Data Format

Each Stepglyph recording is a self-contained project directory.

```txt
stepglyph-output/
  project.json
  steps.json
  captures/
    step-001.png
  exports/
    assets/
      step-001-annotated.png
    guide.md
    guide.html
    project.json
    steps.json
```

## `project.json`

```json
{
  "schemaVersion": "1.0.0",
  "id": "proj_20260527_100000_abc123",
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

## `steps.json`

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
        "editable": true,
        "hidden": false
      }
    ]
  }
]
```

Coordinates are normalized from `0` to `1` relative to the screenshot.
