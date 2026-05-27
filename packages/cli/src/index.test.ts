import { describe, expect, it } from "vitest";
import { formatHelp, parseArgs } from "./index.js";

describe("cli", () => {
  it("parses dev options", () => {
    const parsed = parseArgs(["dev", "--port", "4317", "--workspace", ".stepglyph"]);

    expect(parsed).toMatchObject({
      command: "dev",
      port: 4317
    });
    expect(parsed.command === "dev" ? parsed.sampleProjectDir : "").toContain("fixtures/sample-project");
    expect(parsed.command === "dev" ? parsed.workspaceDir : "").toContain(".stepglyph");
  });

  it("returns help", () => {
    expect(parseArgs(["--help"])).toEqual({ command: "help" });
    expect(formatHelp()).toContain("stepglyph dev");
  });

  it("reports unknown commands", () => {
    expect(parseArgs(["record"])).toEqual({
      command: "unknown",
      message: "Unknown command: record"
    });
  });
});
