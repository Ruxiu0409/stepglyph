import { useEffect, useMemo, useState } from "react";
import { Annotation, Step, StudioApi, studioApi, StudioProject } from "./api";

type AppProps = {
  api?: StudioApi;
  initialProjectId?: string;
};

export function App({ api = studioApi, initialProjectId }: AppProps) {
  const [projectId] = useState(() => initialProjectId ?? getProjectIdFromLocation());
  const [project, setProject] = useState<StudioProject["project"] | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string>("");
  const [status, setStatus] = useState("Loading");
  const [exportMessage, setExportMessage] = useState("");

  useEffect(() => {
    if (!projectId) {
      setStatus("No project selected");
      return;
    }

    api.getProject(projectId)
      .then((data) => {
        setProject(data.project);
        setSteps(data.steps);
        setSelectedStepId(data.steps[0]?.id ?? "");
        setSelectedAnnotationId(data.steps[0]?.annotations[0]?.id ?? "");
        setStatus("Saved");
      })
      .catch((error: Error) => setStatus(error.message));
  }, [api, projectId]);

  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedStepId) ?? steps[0],
    [selectedStepId, steps]
  );
  const selectedAnnotation = selectedStep?.annotations.find(
    (annotation) => annotation.id === selectedAnnotationId
  ) ?? selectedStep?.annotations[0];

  async function persist(nextSteps: Step[]) {
    if (!projectId) return;
    setSteps(nextSteps);
    setStatus("Saving");
    try {
      const saved = await api.saveSteps(projectId, nextSteps);
      setProject(saved.project);
      setSteps(saved.steps);
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    }
  }

  function updateSelectedStep(patch: Partial<Step>) {
    if (!selectedStep) return;
    void persist(steps.map((step) => step.id === selectedStep.id ? { ...step, ...patch } : step));
  }

  function updateSelectedAnnotation(patch: Partial<Annotation>) {
    if (!selectedStep || !selectedAnnotation) return;
    void persist(steps.map((step) => {
      if (step.id !== selectedStep.id) return step;
      return {
        ...step,
        annotations: step.annotations.map((annotation) =>
          annotation.id === selectedAnnotation.id ? { ...annotation, ...patch } : annotation
        )
      };
    }));
  }

  function moveSelectedAnnotation(x: number, y: number) {
    if (!selectedAnnotation) return;
    const target = selectedAnnotation.target.kind === "point"
      ? { ...selectedAnnotation.target, x, y }
      : { ...selectedAnnotation.target, x, y };
    updateSelectedAnnotation({ target });
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!selectedAnnotation) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width);
    const y = clamp((event.clientY - rect.top) / rect.height);
    moveSelectedAnnotation(x, y);
  }

  function reorderSelected(direction: -1 | 1) {
    if (!selectedStep) return;
    const index = steps.findIndex((step) => step.id === selectedStep.id);
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    void persist(next);
  }

  function duplicateSelected() {
    if (!selectedStep) return;
    const copy: Step = {
      ...selectedStep,
      id: `${selectedStep.id}_copy_${Date.now()}`,
      title: `${selectedStep.title} copy`,
      annotations: selectedStep.annotations.map((annotation) => ({
        ...annotation,
        id: `${annotation.id}_copy_${Date.now()}`
      }))
    };
    const index = steps.findIndex((step) => step.id === selectedStep.id);
    void persist([...steps.slice(0, index + 1), copy, ...steps.slice(index + 1)]);
    setSelectedStepId(copy.id);
  }

  function deleteSelected() {
    if (!selectedStep) return;
    const next = steps.filter((step) => step.id !== selectedStep.id);
    setSelectedStepId(next[0]?.id ?? "");
    void persist(next);
  }

  async function runExport() {
    if (!projectId) return;
    setExportMessage("Exporting");
    try {
      const result = await api.exportProject(projectId);
      setExportMessage(
        result.warnings.length > 0
          ? `${result.files.length} files exported. ${result.warnings.join(" ")}`
          : `${result.files.length} files exported.`
      );
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Export failed");
    }
  }

  if (!projectId) {
    return (
      <main className="empty-shell">
        <h1>Stepglyph Studio</h1>
        <p>Start a recorder session from Codex, then open the Studio URL returned by Stepglyph.</p>
      </main>
    );
  }

  return (
    <main className="studio-shell">
      <aside className="step-sidebar" aria-label="Steps">
        <div className="brand-block">
          <span className="mark">S</span>
          <div>
            <h1>Stepglyph</h1>
            <p>{project?.title ?? "Loading project"}</p>
          </div>
        </div>
        <div className="step-list">
          {steps.map((step) => (
            <button
              className={`step-row ${step.id === selectedStep?.id ? "selected" : ""}`}
              key={step.id}
              onClick={() => {
                setSelectedStepId(step.id);
                setSelectedAnnotationId(step.annotations[0]?.id ?? "");
              }}
            >
              <span className="step-index">{step.index}</span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.hidden ? "Hidden" : step.sensitive ? "Sensitive" : "Included"}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="canvas-pane">
        <header className="topbar">
          <div>
            <strong>{selectedStep?.title ?? "No steps yet"}</strong>
            <span>{status}</span>
          </div>
          <div className="toolbar">
            <button onClick={() => reorderSelected(-1)} aria-label="Move step up">↑</button>
            <button onClick={() => reorderSelected(1)} aria-label="Move step down">↓</button>
            <button onClick={duplicateSelected}>Duplicate</button>
            <button onClick={deleteSelected}>Delete</button>
            <button className="primary" onClick={runExport}>Export</button>
          </div>
        </header>

        {selectedStep ? (
          <div className="screenshot-stage">
            <div
              className="screenshot-frame"
              onClick={handleCanvasClick}
              role="presentation"
            >
              <img
                src={`/projects/${projectId}/${selectedStep.screenshot.path}?v=${encodeURIComponent(project?.updatedAt ?? "")}`}
                alt={selectedStep.title}
              />
              {selectedStep.annotations.filter((annotation) => !annotation.hidden).map((annotation) => (
                <AnnotationMarker
                  annotation={annotation}
                  selected={annotation.id === selectedAnnotation?.id}
                  key={annotation.id}
                  onSelect={() => setSelectedAnnotationId(annotation.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">No captured steps yet.</div>
        )}
      </section>

      <aside className="inspector" aria-label="Inspector">
        <section>
          <h2>Step</h2>
          <label>
            Title
            <input
              value={selectedStep?.title ?? ""}
              onChange={(event) => updateSelectedStep({ title: event.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              value={selectedStep?.description ?? ""}
              onChange={(event) => updateSelectedStep({ description: event.target.value })}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={selectedStep?.hidden ?? false}
              onChange={(event) => updateSelectedStep({ hidden: event.target.checked })}
            />
            Hide from export
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={selectedStep?.sensitive ?? false}
              onChange={(event) => updateSelectedStep({ sensitive: event.target.checked })}
            />
            Sensitive step
          </label>
        </section>

        <section>
          <h2>Annotation</h2>
          {selectedAnnotation ? (
            <>
              <label>
                Label
                <input
                  value={selectedAnnotation.label}
                  onChange={(event) => updateSelectedAnnotation({ label: event.target.value })}
                />
              </label>
              <label>
                Type
                <select
                  value={selectedAnnotation.type}
                  onChange={(event) =>
                    updateSelectedAnnotation({ type: event.target.value as Annotation["type"] })
                  }
                >
                  <option value="click-ring">Click ring</option>
                  <option value="box">Box</option>
                  <option value="callout">Callout</option>
                  <option value="badge">Badge</option>
                  <option value="spotlight">Spotlight</option>
                </select>
              </label>
              <label>
                Color
                <input
                  type="color"
                  value={selectedAnnotation.style.color}
                  onChange={(event) =>
                    updateSelectedAnnotation({
                      style: { ...selectedAnnotation.style, color: event.target.value }
                    })
                  }
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={selectedAnnotation.hidden ?? false}
                  onChange={(event) => updateSelectedAnnotation({ hidden: event.target.checked })}
                />
                Hide marker
              </label>
              <p className="hint">Click the screenshot to move the selected marker.</p>
            </>
          ) : (
            <p className="hint">This step has no annotations.</p>
          )}
        </section>

        <section>
          <h2>Export</h2>
          <p className="hint">{exportMessage || "Markdown, HTML, and JSON are generated locally."}</p>
        </section>
      </aside>
    </main>
  );
}

function AnnotationMarker({
  annotation,
  selected,
  onSelect
}: {
  annotation: Annotation;
  selected: boolean;
  onSelect: () => void;
}) {
  const style = annotation.target.kind === "point"
    ? {
        left: `${annotation.target.x * 100}%`,
        top: `${annotation.target.y * 100}%`,
        "--marker-color": annotation.style.color
      } as React.CSSProperties
    : {
        left: `${annotation.target.x * 100}%`,
        top: `${annotation.target.y * 100}%`,
        width: `${annotation.target.width * 100}%`,
        height: `${annotation.target.height * 100}%`,
        "--marker-color": annotation.style.color
      } as React.CSSProperties;

  return (
    <button
      className={`annotation-marker ${annotation.target.kind} ${selected ? "selected" : ""}`}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      aria-label={`Select annotation ${annotation.label}`}
    >
      <span>{annotation.label}</span>
    </button>
  );
}

function getProjectIdFromLocation(): string {
  const pathMatch = window.location.pathname.match(/\/studio\/([^/]+)/);
  if (pathMatch) return pathMatch[1];
  return new URLSearchParams(window.location.search).get("project") ?? "";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
