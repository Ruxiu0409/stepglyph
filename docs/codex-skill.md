# Codex Skill

The Stepglyph Codex skill lets Codex record meaningful documentation steps
without leaving the user's normal Codex session.

## Install During Development

Use the skill file at:

```txt
packages/codex-skill/SKILL.md
```

Start the local recorder:

```bash
npm run dev
```

Then ask Codex:

```txt
Use Stepglyph to record this workflow as an editable guide.
```

## Recorder Endpoints

- `POST /api/sessions/start`
- `POST /api/sessions/:id/capture`
- `POST /api/sessions/:id/finish`

The skill should call `capture` only at meaningful documentation moments. It
must not ask Codex to run a background recorder, timer, or continuous screen
capture.
