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
  resources: Record<string, { name?: string; id?: string; notes?: string }>;
  tasks: FabricTask[];
  decisions: Array<{ decision: string; reason: string; at: string }>;
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
      { id: "fabric-login", title: "Sign in to Microsoft Fabric", phase: "Foundation", status: "todo", target: "vscode" },
      { id: "workspace", title: "Create or select Fabric workspace", phase: "Foundation", status: "todo", target: "fabric" },
      { id: "git", title: "Connect project source control", phase: "Foundation", status: "todo", target: "vscode" },
      { id: "eventstream", title: "Create Eventstream for turbine telemetry", phase: "Ingestion", status: "todo", target: "fabric" },
      { id: "eventhouse", title: "Configure Eventhouse / KQL destination", phase: "Ingestion", status: "todo", target: "fabric" },
      { id: "lakehouse", title: "Create Lakehouse", phase: "Medallion", status: "todo", target: "fabric" },
      { id: "bronze", title: "Implement Bronze ingestion", phase: "Medallion", status: "todo", target: "fabric" },
      { id: "silver", title: "Implement Silver transformations", phase: "Medallion", status: "todo", target: "fabric" },
      { id: "gold", title: "Build Gold business tables", phase: "Medallion", status: "todo", target: "fabric" },
      { id: "semantic-model", title: "Create semantic model", phase: "Serving", status: "todo", target: "fabric" },
      { id: "power-bi", title: "Create Power BI report", phase: "Serving", status: "todo", target: "fabric" },
      { id: "monitoring", title: "Configure monitoring", phase: "Operations", status: "todo", target: "toolbox" },
      { id: "deployment", title: "Configure deployment / CI-CD", phase: "Operations", status: "todo", target: "toolbox" }
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

export function renderHandoff(manifest: FabricProjectManifest): string {
  const completed = manifest.tasks.filter(task => task.status === "done");
  const current = manifest.tasks.filter(task => task.status === "in_progress");
  const remaining = manifest.tasks.filter(task => task.status === "todo" || task.status === "blocked");
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

  return `# Fabric project handoff: ${manifest.project.name}

## Project
- Type: ${manifest.project.type}
- Environment: ${manifest.project.environment}
- Last updated: ${manifest.project.updatedAt}

## Architecture
${architecture}

## Completed
${taskLines(completed)}

## In progress
${taskLines(current)}

## Remaining
${taskLines(remaining)}

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
