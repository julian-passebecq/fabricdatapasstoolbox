import * as vscode from "vscode";
import { FabricTask } from "./projectState";

const FABRIC_CORE_ID = "fabric.vscode-fabric";
const FABRIC_STUDIO_ID = "GerhardBrueckl.fabricstudio";
const FABRIC_PORTAL = "https://app.fabric.microsoft.com/";

export interface FabricIntegrationStatus {
  coreInstalled: boolean;
  coreActive: boolean;
  studioInstalled: boolean;
  studioActive: boolean;
  bridgeMode: "commands" | "portal";
}

export async function getFabricIntegrationStatus(): Promise<FabricIntegrationStatus> {
  const core = vscode.extensions.getExtension(FABRIC_CORE_ID);
  const studio = vscode.extensions.getExtension(FABRIC_STUDIO_ID);
  const commands = new Set(await vscode.commands.getCommands(true));

  return {
    coreInstalled: Boolean(core),
    coreActive: Boolean(core?.isActive),
    studioInstalled: Boolean(studio),
    studioActive: Boolean(studio?.isActive),
    bridgeMode: commands.has("vscode-fabric.createArtifact") ? "commands" : "portal"
  };
}

export async function openFabricHome(): Promise<void> {
  const commands = new Set(await vscode.commands.getCommands(true));
  if (commands.has("vscode-fabric.refreshArtifactView")) {
    try {
      await vscode.commands.executeCommand("workbench.view.extension.vscode-fabric_view_workspace");
      return;
    } catch {
      // Fall through to the Fabric portal.
    }
  }

  await vscode.env.openExternal(vscode.Uri.parse(FABRIC_PORTAL));
}

export async function runTaskTarget(task: FabricTask): Promise<string> {
  switch (task.id) {
    case "fabric-login":
      return runCommandOrFallback(
        "vscode-fabric.signIn",
        "Opened the Microsoft Fabric sign-in flow.",
        FABRIC_PORTAL
      );

    case "workspace":
      return runCommandOrFallback(
        "vscode-fabric.createWorkspace",
        "Opened Microsoft Fabric workspace creation.",
        FABRIC_PORTAL
      );

    case "git":
      await vscode.commands.executeCommand("workbench.view.scm");
      return "Opened VS Code Source Control.";

    case "eventstream":
    case "eventhouse":
    case "lakehouse":
    case "bronze":
    case "silver":
    case "gold":
    case "semantic-model":
    case "power-bi":
      return runCommandOrFallback(
        "vscode-fabric.createArtifact",
        "Opened the Microsoft Fabric item creation flow.",
        FABRIC_PORTAL
      );

    case "monitoring":
      await vscode.commands.executeCommand("workbench.actions.view.openView", "datapassFabric.toolbox");
      return "Opened the Datapass Toolbox monitoring/tool catalog.";

    case "deployment":
      return openDeploymentSurface();

    default:
      await openFabricHome();
      return "Opened Microsoft Fabric.";
  }
}

export async function openFabricStudio(): Promise<void> {
  const studio = vscode.extensions.getExtension(FABRIC_STUDIO_ID);
  if (studio) {
    try {
      await vscode.commands.executeCommand("workbench.view.extension.fabricstudio");
      return;
    } catch {
      // Fall through to the Marketplace page.
    }
  }

  await vscode.env.openExternal(
    vscode.Uri.parse("https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio")
  );
}

async function openDeploymentSurface(): Promise<string> {
  const studio = vscode.extensions.getExtension(FABRIC_STUDIO_ID);
  if (studio) {
    await openFabricStudio();
    return "Opened FabricStudio. Use its Deployment Pipelines view.";
  }

  await vscode.commands.executeCommand("workbench.actions.view.openView", "datapassFabric.toolbox");
  return "Opened the Datapass Toolbox. FabricStudio remains optional for Deployment Pipelines UI.";
}

async function runCommandOrFallback(
  command: string,
  successMessage: string,
  fallbackUrl: string
): Promise<string> {
  const commands = new Set(await vscode.commands.getCommands(true));
  if (commands.has(command)) {
    try {
      await vscode.commands.executeCommand(command);
      return successMessage;
    } catch {
      // If the upstream command changes or fails, keep the workflow usable.
    }
  }

  await vscode.env.openExternal(vscode.Uri.parse(fallbackUrl));
  return "The upstream VS Code command was unavailable, so the Fabric portal was opened instead.";
}
