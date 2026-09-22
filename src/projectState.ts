import * as vscode from "vscode";
import {
  FabricProjectManifest,
  FabricResource,
  MANIFEST_NAME,
  renderHandoff,
  TaskStatus
} from "./projectModel";
import {
  createProjectFromTemplate,
  ProjectTemplateId
} from "./projectTemplates";

export * from "./projectModel";

export const HANDOFF_NAME = "FABRIC_HANDOFF.md";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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

export async function initializeProject(
  templateId: ProjectTemplateId = "foil-wind-realtime"
): Promise<FabricProjectManifest> {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Open a VS Code folder before initializing a Fabric project.");
  }

  const existing = await readManifest();
  if (existing) {
    return existing;
  }

  const manifest = createProjectFromTemplate(templateId);
  await writeManifest(manifest);
  return manifest;
}

export async function initializeFoilProject(): Promise<FabricProjectManifest> {
  return initializeProject("foil-wind-realtime");
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

export async function exportHandoff(manifest: FabricProjectManifest): Promise<vscode.Uri> {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("No workspace folder is open.");
  }

  const uri = vscode.Uri.joinPath(root, HANDOFF_NAME);
  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(renderHandoff(manifest)));
  return uri;
}
