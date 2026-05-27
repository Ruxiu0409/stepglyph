import { describe, expect, it } from "vitest";
import {
  PointTargetSchema,
  ProjectSchema,
  StepglyphCaptureEventSchema
} from "./schema.js";

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lBQLGQAAAABJRU5ErkJggg==";

describe("schema", () => {
  it("parses a valid project", () => {
    const project = ProjectSchema.parse({
      schemaVersion: "1.0.0",
      id: "proj_1",
      title: "Demo",
      createdAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
      source: { adapter: "codex-skill", agent: "codex" },
      settings: { redactInputs: true, theme: "default" }
    });

    expect(project.title).toBe("Demo");
  });

  it("rejects normalized coordinates outside the screenshot bounds", () => {
    expect(() => PointTargetSchema.parse({ kind: "point", x: 1.2, y: 0.5 })).toThrow();
  });

  it("parses explicit capture events", () => {
    const event = StepglyphCaptureEventSchema.parse({
      action: "click",
      title: "Click settings",
      screenshot: {
        kind: "png-base64",
        data: tinyPng,
        width: 1,
        height: 1
      },
      target: { kind: "point", x: 0.5, y: 0.5 }
    });

    expect(event.action).toBe("click");
    expect(event.description).toBe("");
    expect(event.sensitive).toBe(false);
  });
});
