import * as vscode from "vscode";
import {
  FabricProjectManifest,
  FabricResource,
  MANIFEST_NAME,
  renderHandoff,
  TaskStatus,
  validateManifestDocument
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

export interface ManifestReadResult {
  exists: boolean;
  manifest?: FabricProjectManifest;
  errors: string[];
}

export async function readManifestResult(): Promise<ManifestReadResult> {
  const uri = manifestUri();
  if (!uri) {
    return { exists: false, errors: [] };
  }

  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    return { exists: false, errors: [] };
  }

  let raw: unknown;
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    raw = JSON.parse(textDecoder.decode(bytes));
  } catch (error) {
    return {
      exists: true,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`]
    };
  }

  const errors = validateManifestDocument(raw);
  if (errors.length) {
    return { exists: true, errors };
  }

  return {
    exists: true,
    manifest: raw as FabricProjectManifest,
    errors: []
  };
}

export async function readManifest(): Promise<FabricProjectManifest | undefined> {
  return (await readManifestResult()).manifest;
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

  const existing = await readManifestResult();
  if (existing.exists) {
    if (existing.manifest) {
      return existing.manifest;
    }
    throw new Error(
      `Existing ${MANIFEST_NAME} is invalid: ${existing.errors.join(" ")}`
    );
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
