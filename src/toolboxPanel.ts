import * as vscode from "vscode";
import {
  getFabricIntegrationStatus,
  openFabricHome,
  openFabricStudio
} from "./fabricIntegration";
import { getProgress, getProjectIssues, getReadyTasks, readManifest } from "./projectState";
import {
  configureToolboxRoot,
  copyAssessmentCommand,
  copySecurityAuditCommand,
  getToolRuntimeStatus,
  openWorkspaceMcpConfig,
  runAssessment,
  runSecurityAudit
} from "./toolRunners";

const URLS: Record<string, string> = {
  migration: "https://github.com/microsoft/fabric-toolbox/tree/main/tools/FabricDataFactoryMigrationAssistant",
  assessment: "https://github.com/microsoft/fabric-toolbox/tree/main/tools/fabric-assessment-tool",
  security: "https://github.com/microsoft/fabric-toolbox/tree/main/tools/fabric-security-audit",
  toolbox: "https://github.com/microsoft/fabric-toolbox",
  costMonitoring: "https://github.com/microsoft/fabric-toolbox/tree/main/monitoring/fabric-cost-analysis",
  platformMonitoring: "https://github.com/microsoft/fabric-toolbox/tree/main/monitoring/fabric-platform-monitoring",
  sparkMonitoring: "https://github.com/microsoft/fabric-toolbox/tree/main/monitoring/fabric-spark-monitoring",
  workspaceMonitoring: "https://github.com/microsoft/fabric-toolbox/tree/main/monitoring/workspace-monitoring-dashboards",
  cicd: "https://github.com/microsoft/fabric-toolbox/tree/main/accelerators/CICD",
  bcdr: "https://github.com/microsoft/fabric-toolbox/tree/main/accelerators/BCDR",
  semanticAudit: "https://github.com/microsoft/fabric-toolbox/tree/main/tools/SemanticModelAudit"
};

export class ToolboxViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "datapassFabric.toolbox";
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist")]
    };

    const script = view.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "dist", "webview.js"));
    const style = view.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "dist", "webview.css"));
    const nonce = createNonce();

    view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${view.webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${style}" rel="stylesheet">
  <title>Datapass Fabric Toolbox</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;

    view.webview.onDidReceiveMessage(async message => {
      try {
        if (message?.type === "ready") {
          await this.refresh();
          return;
        }

        if (message?.type === "open" && typeof message.target === "string") {
          await this.openTarget(message.target);
          return;
        }

        if (message?.type === "command") {
          await this.handleCommand(message.command);
          return;
        }

        if (message?.type === "securityAudit") {
          const input = {
            url: String(message.url ?? ""),
            user: message.user ? String(message.user) : undefined
          };
          const command = message.action === "run"
            ? await runSecurityAudit(input)
            : await copySecurityAuditCommand(input);
          void vscode.window.showInformationMessage(
            message.action === "run"
              ? "Fabric Security Audit started in PowerShell."
              : "Fabric Security Audit command copied to the clipboard."
          );
          await this.postResult("security", command);
          return;
        }

        if (message?.type === "assessment") {
          const source = message.source === "databricks" ? "databricks" : "synapse";
          const input = {
            source,
            workspace: message.workspace ? String(message.workspace) : undefined,
            output: String(message.output ?? "./fabric-assessment-output")
          } as const;
          const command = message.action === "run"
            ? await runAssessment(input)
            : await copyAssessmentCommand(input);
          void vscode.window.showInformationMessage(
            message.action === "run"
              ? "Fabric Assessment Tool started in PowerShell."
              : "Fabric Assessment Tool command copied to the clipboard."
          );
          await this.postResult("assessment", command);
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(messageText);
        await this.postError(messageText);
      }
    });
  }

  async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }

    const [environment, manifest, runtime] = await Promise.all([
      getFabricIntegrationStatus(),
      readManifest(),
      getToolRuntimeStatus()
    ]);

    const progress = manifest ? getProgress(manifest) : undefined;
    const issues = manifest ? getProjectIssues(manifest) : [];
    const readyTasks = manifest ? getReadyTasks(manifest) : [];
    await this.view.webview.postMessage({
      type: "state",
      environment,
      runtime,
      project: manifest && progress
        ? {
            name: manifest.project.name,
            type: manifest.project.type,
            environment: manifest.project.environment,
            done: progress.done,
            total: progress.total,
            percent: progress.percent,
            nextTitle: progress.next?.title,
            nextTaskId: progress.next?.id,
            resourceCount: Object.keys(manifest.resources).length,
            issueCount: issues.length,
            readyTitles: readyTasks.map(task => task.title),
            architectureStages: [
              { label: "Sources", items: manifest.architecture.source },
              { label: "Ingestion", items: manifest.architecture.ingestion },
              { label: "Storage", items: manifest.architecture.storage },
              { label: "Medallion", items: manifest.architecture.layers },
              { label: "Serving", items: manifest.architecture.serving }
            ]
          }
        : undefined
    });
  }

  private async handleCommand(command: unknown): Promise<void> {
    if (command === "initialize") {
      await vscode.commands.executeCommand("datapassFabric.initializeProject");
    } else if (command === "checklist") {
      await vscode.commands.executeCommand(
        "workbench.actions.view.openView",
        "datapassFabric.checklist"
      );
    } else if (command === "handoff") {
      await vscode.commands.executeCommand("datapassFabric.exportHandoff");
    } else if (command === "next") {
      const manifest = await readManifest();
      const next = manifest ? getProgress(manifest).next : undefined;
      if (next) {
        await vscode.commands.executeCommand("datapassFabric.taskAction", next.id);
      } else {
        void vscode.window.showInformationMessage("Fabric project checklist is complete.");
      }
      await this.refresh();
    } else if (command === "validate") {
      await vscode.commands.executeCommand("datapassFabric.validateProject");
      await this.refresh();
    } else if (command === "configureToolboxRoot") {
      await configureToolboxRoot();
      await this.refresh();
    } else if (command === "mcpConfig") {
      await openWorkspaceMcpConfig();
      await this.refresh();
    }
  }

  private async openTarget(target: string): Promise<void> {
    if (target === "fabric") {
      await openFabricHome();
      return;
    }

    if (target === "fabricStudio") {
      await openFabricStudio();
      return;
    }

    const url = URLS[target];
    if (url) {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }
  }

  private async postResult(tool: string, command: string): Promise<void> {
    await this.view?.webview.postMessage({
      type: "toolResult",
      tool,
      command
    });
  }

  private async postError(message: string): Promise<void> {
    await this.view?.webview.postMessage({
      type: "toolError",
      message
    });
  }
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}
