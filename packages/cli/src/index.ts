#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRecorderServer } from "@stepglyph/recorder-server";

export type DevOptions = {
  command: "dev";
  port: number;
  workspaceDir: string;
};

export type ParsedCommand = DevOptions | { command: "help" } | { command: "unknown"; message: string };

export function parseArgs(argv: string[]): ParsedCommand {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    return { command: "help" };
  }
  if (command !== "dev") {
    return { command: "unknown", message: `Unknown command: ${command}` };
  }

  return {
    command: "dev",
    port: readNumberOption(rest, "--port", 4317),
    workspaceDir: path.resolve(process.env.INIT_CWD ?? process.cwd(), readStringOption(rest, "--workspace", ".stepglyph"))
  };
}

export function formatHelp(): string {
  return [
    "Stepglyph",
    "",
    "Commands:",
    "  stepglyph dev [--port 4317] [--workspace .stepglyph]",
    "",
    "The dev command starts the local recorder service and serves Studio on localhost."
  ].join("\n");
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseArgs(argv);
  if (parsed.command === "help") {
    console.log(formatHelp());
    return;
  }
  if (parsed.command === "unknown") {
    console.error(parsed.message);
    console.error(formatHelp());
    process.exitCode = 1;
    return;
  }

  await mkdir(parsed.workspaceDir, { recursive: true });
  const studioDistDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../apps/studio/dist"
  );
  const app = createRecorderServer({
    workspaceDir: parsed.workspaceDir,
    studioDistDir
  });

  app.listen(parsed.port, "127.0.0.1", () => {
    console.log(`Stepglyph recorder: http://127.0.0.1:${parsed.port}`);
    console.log(`Studio: http://127.0.0.1:${parsed.port}`);
    console.log("Capture mode: explicit only. No background screen recording.");
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runCli();
}

function readStringOption(argv: string[], name: string, fallback: string): string {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function readNumberOption(argv: string[], name: string, fallback: number): number {
  const raw = readStringOption(argv, name, String(fallback));
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
