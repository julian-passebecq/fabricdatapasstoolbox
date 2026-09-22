import * as vscode from "vscode";

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface FabricTask {
  id: string;
  title: string;
  phase: string;
  status: TaskStatus;
  description?: string;
  target?: "vscode" | "fabric" | "toolbox";
}

export interface FabricResource {
  name?: string;
  id?: string;
  notes?: string;
}

export interface FabricProjectManifest {
  schemaVersion: 1;
  project: {
    name: string;
    type: string;
    environment: string;
    createdAt: string;
    updatedAt: string;
  };
  architecture: {
    source: string[];
    ingestion: string[];
    storage: string[];
    layers: string[];
    serving: string[];
  };
  resources: Record<string, FabricResource>;
  tasks: FabricTask[];
  decisions: Array<{ decision: string; reason: string; at: string }>;
}

export interface ProjectProgress {
  done: number;
  total: number;
  percent: number;
  next?: FabricTask;
}

export const MANIFEST_NAME = "fabric.project.json";
export const HANDOFF_NAME = "FABRIC_HANDOFF.md";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function defaultFoilManifest(): FabricProjectManifest {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    project: {
      name: "foil-wind",
      type: "realtime-medallion",
      environment: "dev",
      createdAt: now,
      updatedAt: now
    },
    architecture: {
      source: ["oracle-vm", "kafka"],
      ingestion: ["eventstream"],
      storage: ["eventhouse", "lakehouse"],
      layers: ["bronze", "silver", "gold"],
      serving: ["sql", "power-bi"]
    },
    resources: {},
    tasks: [
      {
        id: "fabric-login",
        title: "Sign in to Microsoft Fabric",
        phase: "Foundation",
        status: "todo",
        target: "vscode",
        description: "Authenticate through the official Microsoft Fabric VS Code extension."
      },
      {
        id: "workspace",
        title: "Create or select Fabric workspace",
        phase: "Foundation",
        status: "todo",
        target: "fabric",
        description: "Create the Foil'o development workspace or select the workspace that will own this project."
      },
      {
        id: "git",
        title: "Connect project source control",
        phase: "Foundation",
        status: "todo",
        target: "vscode",
        description: "Keep project definitions and Datapass state under Git so changes and decisions remain inspectable."
      },
      {
        id: "eventstream",
        title: "Create Eventstream for turbine telemetry",
        phase: "Ingestion",
        status: "todo",
        target: "fabric",
        description: "Receive the wind-turbine event stream that will ultimately come from the Oracle VM / Kafka simulator."
      },
      {
        id: "eventhouse",
        title: "Configure Eventhouse / KQL destination",
        phase: "Ingestion",
        status: "todo",
        target: "fabric",
        description: "Persist and query real-time telemetry through Eventhouse / KQL."
      },
      {
        id: "lakehouse",
        title: "Create Lakehouse",
        phase: "Medallion",
        status: "todo",
        target: "fabric",
        description: "Create the Lakehouse used for the Bronze, Silver and Gold learning path."
      },
      {
        id: "bronze",
        title: "Implement Bronze ingestion",
        phase: "Medallion",
        status: "todo",
        target: "fabric",
        description: "Land raw telemetry with minimal transformation and enough metadata for replay/debugging."
      },
      {
        id: "silver",
        title: "Implement Silver transformations",
        phase: "Medallion",
        status: "todo",
        target: "fabric",
        description: "Clean, type, deduplicate and enrich turbine telemetry into reusable analytical tables."
      },
      {
        id: "gold",
        title: "Build Gold business tables",
        phase: "Medallion",
        status: "todo",
        target: "fabric",
        description: "Create KPI-ready aggregates such as production, availability and turbine health summaries."
      },
      {
        id: "semantic-model",
        title: "Create semantic model",
        phase: "Serving",
        status: "todo",
        target: "fabric",
        description: "Model Gold data for reporting with explicit business measures and relationships."
      },
      {
        id: "power-bi",
        title: "Create Power BI report",
        phase: "Serving",
        status: "todo",
        target: "fabric",
        description: "Build the final operational/business report from the curated semantic layer."
      },
      {
        id: "monitoring",
        title: "Configure monitoring",
        phase: "Operations",
        status: "todo",
        target: "toolbox",
        description: "Select the useful Fabric Toolbox monitoring assets instead of recreating monitoring from scratch."
      },
      {
        id: "deployment",
        title: "Configure deployment / CI-CD",
        phase: "Operations",
        status: "todo",
        target: "toolbox",
        description: "Define promotion and deployment flow once the development architecture is stable."
      }
    ],
    decisions: [
      {
        decision: "Use Eventstream for real-time turbine ingestion",
        reason: "The Foil'o case is real-time telemetry and should exercise Fabric RTI instead of only batch pipelines.",
        at: now
      },
      {
        decision: "Keep both Eventhouse and Lakehouse",
        reason: "Eventhouse supports KQL/real-time investigation while Lakehouse supports the Bronze/Silver/Gold learning path.",
        at: now
      }
    ]
  };
}

export function getWorkspaceRoot(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri;
}

export function manifestUri(root = getWorkspaceRoot()): vscode.Uri | undefined {
  return root ? vscode.Uri.joinPath(root, MANIFEST_NAME) : undefined;
}

export async function readManifest(): Promise<FabricProjectManifest | undefined> {
  const uri = manifestUri();
  if (!uri) {
    return undefined;
  }

  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(textDecoder.decode(bytes)) as FabricProjectManifest;
  } catch {
    return undefined;
  }
}

export async function writeManifest(manifest: FabricProjectManifest): Promise<void> {
  const uri = manifestUri();
  if (!uri) {
    throw new Error("Open a VS Code folder before initializing a Fabric project.");
  }

  manifest.project.updatedAt = new Date().toISOString();
  const content = JSON.stringify(manifest, null, 2) + "\n";
  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(content));
}

export async function initializeFoilProject(): Promise<FabricProjectManifest> {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Open a VS Code folder before initializing a Fabric project.");
  }

  const existing = await readManifest();
  if (existing) {
    return existing;
  }

  const manifest = defaultFoilManifest();
  await writeManifest(manifest);
  return manifest;
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<FabricProjectManifest | undefined> {
  const manifest = await readManifest();
  if (!manifest) {
    return undefined;
  }

  const task = manifest.tasks.find(item => item.id === taskId);
  if (!task) {
    return manifest;
  }

  task.status = status;
  await writeManifest(manifest);
  return manifest;
}

export async function toggleTask(taskId: string): Promise<FabricProjectManifest | undefined> {
  const manifest = await readManifest();
  if (!manifest) {
    return undefined;
  }

  const task = manifest.tasks.find(item => item.id === taskId);
  if (!task) {
    return manifest;
  }

  task.status = task.status === "done" ? "todo" : "done";
  await writeManifest(manifest);
  return manifest;
}

export async function upsertResource(
  key: string,
  value: FabricResource
): Promise<FabricProjectManifest | undefined> {
  const manifest = await readManifest();
  if (!manifest) {
    return undefined;
  }

  manifest.resources[key] = value;
  await writeManifest(manifest);
  return manifest;
}

export function getProgress(manifest: FabricProjectManifest): ProjectProgress {
  const done = manifest.tasks.filter(task => task.status === "done").length;
  const total = manifest.tasks.length;
  const next =
    manifest.tasks.find(task => task.status === "in_progress") ??
    manifest.tasks.find(task => task.status === "todo") ??
    manifest.tasks.find(task => task.status === "blocked");

  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    next
  };
}

export function renderHandoff(manifest: FabricProjectManifest): string {
  const completed = manifest.tasks.filter(task => task.status === "done");
  const current = manifest.tasks.filter(task => task.status === "in_progress");
  const remaining = manifest.tasks.filter(task => task.status === "todo" || task.status === "blocked");
  const progress = getProgress(manifest);
  const architecture = [
    ...manifest.architecture.source,
    ...manifest.architecture.ingestion,
    ...manifest.architecture.storage,
    ...manifest.architecture.layers,
    ...manifest.architecture.serving
  ].join(" -> ");

  const taskLines = (tasks: FabricTask[]) => tasks.length
    ? tasks.map(task => `- ${task.title} (${task.phase})`).join("\n")
    : "- None";

  const resourceEntries = Object.entries(manifest.resources);
  const resources = resourceEntries.length
    ? resourceEntries
        .map(([key, value]) => `- **${key}**: ${value.name ?? "(unnamed)"}${value.id ? ` — ${value.id}` : ""}${value.notes ? ` — ${value.notes}` : ""}`)
        .join("\n")
    : "- None recorded yet";

  return `# Fabric project handoff: ${manifest.project.name}

## Project
- Type: ${manifest.project.type}
- Environment: ${manifest.project.environment}
- Progress: ${progress.done}/${progress.total} (${progress.percent}%)
- Last updated: ${manifest.project.updatedAt}

## Architecture
${architecture}

## Next action
${progress.next ? `- ${progress.next.title} (${progress.next.phase}) — status: ${progress.next.status}` : "- Project checklist complete"}

## Completed
${taskLines(completed)}

## In progress
${taskLines(current)}

## Remaining
${taskLines(remaining)}

## Resources
${resources}

## Decisions
${manifest.decisions.map(item => `- **${item.decision}** — ${item.reason}`).join("\n") || "- None"}

## Machine-readable state
The authoritative state is \`${MANIFEST_NAME}\`. Read that JSON before changing this project.
`;
}

export async function exportHandoff(manifest: FabricProjectManifest): Promise<vscode.Uri> {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("No workspace folder is open.");
  }

  const uri = vscode.Uri.joinPath(root, HANDOFF_NAME);
  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(renderHandoff(manifest)));
  return uri;
}
