// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { StudioApi, StudioProject } from "./api";

const project: StudioProject = {
  project: {
    id: "proj_1",
    title: "Demo guide",
    updatedAt: "2026-05-27T00:00:00.000Z"
  },
  steps: [
    {
      id: "step_001",
      index: 1,
      title: "Open settings",
      description: "Select settings.",
      hidden: false,
      sensitive: false,
      screenshot: { path: "captures/step-001.png", width: 1, height: 1, deviceScaleFactor: 1 },
      annotations: [
        {
          id: "ann_001",
          type: "click-ring",
          target: { kind: "point", x: 0.5, y: 0.5 },
          label: "Settings",
          style: { color: "#2563eb", size: "medium", labelPosition: "top-right" },
          editable: true
        }
      ]
    },
    {
      id: "step_002",
      index: 2,
      title: "Confirm result",
      description: "",
      hidden: false,
      sensitive: false,
      screenshot: { path: "captures/step-002.png", width: 1, height: 1, deviceScaleFactor: 1 },
      annotations: []
    }
  ]
};

describe("Studio App", () => {
  it("loads a project and edits step title", async () => {
    const api = createApi();
    render(<App api={api} initialProjectId="proj_1" />);

    expect(await screen.findByDisplayValue("Open settings")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Open account settings" }
    });

    await waitFor(() => {
      expect(api.saveSteps).toHaveBeenCalledWith(
        "proj_1",
        expect.arrayContaining([
          expect.objectContaining({ title: "Open account settings" })
        ])
      );
    });
  });

  it("moves the selected marker by clicking the screenshot", async () => {
    const api = createApi();
    render(<App api={api} initialProjectId="proj_1" />);
    const frame = await screen.findByRole("presentation");
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      right: 200,
      bottom: 100,
      toJSON: () => ({})
    } as DOMRect);

    fireEvent.click(frame, { clientX: 150, clientY: 25 });

    await waitFor(() => {
      expect(api.saveSteps).toHaveBeenCalledWith(
        "proj_1",
        expect.arrayContaining([
          expect.objectContaining({
            annotations: expect.arrayContaining([
              expect.objectContaining({
                target: expect.objectContaining({ x: 0.75, y: 0.25 })
              })
            ])
          })
        ])
      );
    });
  });

  it("calls export endpoint", async () => {
    const api = createApi();
    render(<App api={api} initialProjectId="proj_1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(api.exportProject).toHaveBeenCalledWith("proj_1");
    });
    expect(await screen.findByText("3 files exported.")).toBeInTheDocument();
  });
});

function createApi(): StudioApi {
  return {
    getProject: vi.fn(async () => structuredClone(project)),
    saveSteps: vi.fn(async (_projectId, steps) => ({
      project: project.project,
      steps: steps.map((step: StudioProject["steps"][number], index: number) => ({
        ...step,
        index: index + 1
      }))
    })),
    exportProject: vi.fn(async () => ({ files: ["guide.md", "guide.html", "project.json"], warnings: [] }))
  };
}
