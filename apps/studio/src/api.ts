export type Target =
  | { kind: "point"; x: number; y: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number };

export type Annotation = {
  id: string;
  type: "click-ring" | "box" | "callout" | "badge" | "spotlight";
  target: Target;
  label: string;
  style: {
    color: string;
    size: "small" | "medium" | "large";
    labelPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
  editable: boolean;
  hidden?: boolean;
};

export type Step = {
  id: string;
  index: number;
  title: string;
  description: string;
  hidden: boolean;
  sensitive: boolean;
  screenshot: {
    path: string;
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  annotations: Annotation[];
};

export type StudioProject = {
  project: {
    id: string;
    title: string;
    updatedAt: string;
  };
  steps: Step[];
};

export type ExportResponse = {
  files: string[];
  warnings: string[];
};

export type StudioApi = {
  getProject(projectId: string): Promise<StudioProject>;
  saveSteps(projectId: string, steps: Step[]): Promise<StudioProject>;
  exportProject(projectId: string): Promise<ExportResponse>;
};

export const studioApi: StudioApi = {
  async getProject(projectId) {
    const response = await fetch(`/api/projects/${projectId}`);
    return parseResponse(response);
  },
  async saveSteps(projectId, steps) {
    const response = await fetch(`/api/projects/${projectId}/steps`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ steps })
    });
    return parseResponse(response);
  },
  async exportProject(projectId) {
    const response = await fetch(`/api/projects/${projectId}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formats: ["markdown", "html", "json"] })
    });
    return parseResponse(response);
  }
};

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body;
}
