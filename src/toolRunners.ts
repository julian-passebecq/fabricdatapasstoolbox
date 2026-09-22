import * as path from "node:path";
import * as vscode from "vscode";
import { getWorkspaceRoot } from "./projectState";

const SECURITY_RELATIVE_PATH = path.join(
  "tools",
  "fabric-security-audit",
  "Invoke-FabricSecurityAudit.ps1"
);

export interface ToolRuntimeStatus {
  toolboxRoot?: string;
  securityAuditReady: boolean;
  securityAuditPath?: string;
  assessmentCommand: string;
  workspaceMcpConfigured: boolean;
  portableMcpConfigured: boolean;
}

export async function getToolRuntimeStatus(): Promise<ToolRuntimeStatus> {
  const configuration = vscode.workspace.getConfiguration("datapassFabric");
  const toolboxRoot = configuration.get<string>("toolboxRoot", "").trim();
  const assessmentCommand = configuration.get<string>("assessmentCommand", "fat").trim() || "fat";
  const securityAuditPath = toolboxRoot
    ? path.join(toolboxRoot, SECURITY_RELATIVE_PATH)
    : undefined;

  const root = getWorkspaceRoot();
  const workspaceMcpConfigured = root
    ? await exists(vscode.Uri.joinPath(root, ".vscode", "mcp.json"))
    : false;
  const portableMcpConfigured = root
    ? await exists(vscode.Uri.joinPath(root, ".mcp.json"))
    : false;

  return {
    toolboxRoot: toolboxRoot || undefined,
    securityAuditReady: securityAuditPath ? await exists(vscode.Uri.file(securityAuditPath)) : false,
    securityAuditPath,
    assessmentCommand,
    workspaceMcpConfigured,
    portableMcpConfigured
  };
}

export async function configureToolboxRoot(): Promise<string | undefined> {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Use this Fabric Toolbox folder",
    title: "Select local Microsoft Fabric Toolbox clone"
  });

  const folder = selected?.[0];
  if (!folder) {
    return undefined;
  }

  await vscode.workspace
    .getConfiguration("datapassFabric")
    .update("toolboxRoot", folder.fsPath, vscode.ConfigurationTarget.Workspace);

  return folder.fsPath;
}

export async function copySecurityAuditCommand(input: {
  url: string;
  user?: string;
}): Promise<string> {
  const command = await buildSecurityAuditCommand(input);
  await vscode.env.clipboard.writeText(command);
  return command;
}

export async function runSecurityAudit(input: {
  url: string;
  user?: string;
}): Promise<string> {
  const command = await buildSecurityAuditCommand(input);
  const terminal = vscode.window.createTerminal({
    name: "Fabric Security Audit",
    shellPath: powerShellExecutable()
  });
  terminal.show(true);
  terminal.sendText(command, true);
  return command;
}

export async function copyAssessmentCommand(input: {
  source: "synapse" | "databricks";
  workspace?: string;
  output: string;
}): Promise<string> {
  const command = buildAssessmentCommand(input);
  await vscode.env.clipboard.writeText(command);
  return command;
}

export async function runAssessment(input: {
  source: "synapse" | "databricks";
  workspace?: string;
  output: string;
}): Promise<string> {
  const command = buildAssessmentCommand(input);
  const terminal = vscode.window.createTerminal({
    name: "Fabric Assessment Tool",
    shellPath: powerShellExecutable()
  });
  terminal.show(true);
  terminal.sendText(command, true);
  return command;
}

export async function openWorkspaceMcpConfig(): Promise<vscode.Uri> {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Open a VS Code folder before creating an MCP workspace configuration.");
  }

  const vscodeFolder = vscode.Uri.joinPath(root, ".vscode");
  const mcpUri = vscode.Uri.joinPath(vscodeFolder, "mcp.json");
  await vscode.workspace.fs.createDirectory(vscodeFolder);

  if (!(await exists(mcpUri))) {
    const content = new TextEncoder().encode('{\n  "servers": {}\n}\n');
    await vscode.workspace.fs.writeFile(mcpUri, content);
  }

  const document = await vscode.workspace.openTextDocument(mcpUri);
  await vscode.window.showTextDocument(document, { preview: false });
  return mcpUri;
}

async function buildSecurityAuditCommand(input: {
  url: string;
  user?: string;
}): Promise<string> {
  const url = sanitize(input.url, "Fabric URL");
  if (!/^https:\/\//i.test(url)) {
    throw new Error("Fabric Security Audit requires a full https:// Fabric or Power BI item URL.");
  }

  const status = await getToolRuntimeStatus();
  if (!status.securityAuditReady || !status.securityAuditPath) {
    throw new Error(
      "Fabric Security Audit script was not found. Configure Datapass Fabric: Toolbox Root to a local fabric-toolbox clone."
    );
  }

  const parts = [
    "&",
    psQuote(status.securityAuditPath),
    "-Url",
    psQuote(url),
    "-NoPrompt"
  ];

  const user = input.user?.trim();
  if (user) {
    parts.push("-User", psQuote(sanitize(user, "User")));
  }

  return parts.join(" ");
}

function buildAssessmentCommand(input: {
  source: "synapse" | "databricks";
  workspace?: string;
  output: string;
}): string {
  if (input.source !== "synapse" && input.source !== "databricks") {
    throw new Error("Assessment source must be synapse or databricks.");
  }

  const configuration = vscode.workspace.getConfiguration("datapassFabric");
  const configuredCommand = configuration.get<string>("assessmentCommand", "fat").trim() || "fat";
  const command = sanitize(configuredCommand, "Assessment command");
  const output = sanitize(input.output || "./fabric-assessment-output", "Output path");

  const parts = [
    command,
    "assess",
    "--source",
    input.source,
    "--mode",
    "full",
    "-o",
    psQuote(output)
  ];

  const workspace = input.workspace?.trim();
  if (workspace) {
    parts.push("--ws", psQuote(sanitize(workspace, "Workspace")));
  }

  return parts.join(" ");
}

function sanitize(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  if (/[\r\n\0]/.test(trimmed)) {
    throw new Error(`${label} contains unsupported control characters.`);
  }

  return trimmed;
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function powerShellExecutable(): string {
  return process.platform === "win32" ? "powershell.exe" : "pwsh";
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
