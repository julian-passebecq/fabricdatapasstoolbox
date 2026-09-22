import * as vscode from "vscode";
import { ChecklistProvider } from "./checklistProvider";
import { openFabricHome, runTaskTarget } from "./fabricIntegration";
import {
  exportHandoff,
  getProgress,
  initializeFoilProject,
  manifestUri,
  readManifest,
  setTaskStatus,
  TaskStatus,
  toggleTask,
  upsertResource
} from "./projectState";
import { captureResource } from "./resourceCapture";
import { ToolboxViewProvider } from "./toolboxPanel";
import { configureToolboxRoot, openWorkspaceMcpConfig } from "./toolRunners";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const checklist = new ChecklistProvider();
  const toolbox = new ToolboxViewProvider(context.extensionUri);

  const refreshAll = (): void => {
    checklist.refresh();
    void toolbox.refresh();
  };

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("datapassFabric.checklist", checklist),
    vscode.window.registerWebviewViewProvider(ToolboxViewProvider.viewType, toolbox)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("datapassFabric.initializeProject", async () => {
      try {
        const manifest = await initializeFoilProject();
        refreshAll();
        void vscode.window.showInformationMessage(
          `Datapass Fabric project '${manifest.project.name}' is ready.`
        );
      } catch (error) {
        void vscode.window.showErrorMessage(toMessage(error));
      }
    }),

    vscode.commands.registerCommand("datapassFabric.openManifest", async () => {
      const uri = manifestUri();
      if (!uri) {
        void vscode.window.showWarningMessage("Open a folder first.");
        return;
      }

      try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
      } catch {
        void vscode.window.showInformationMessage(
          "No fabric.project.json found. Initialize the project first."
        );
      }
    }),

    vscode.commands.registerCommand("datapassFabric.recordResource", async () => {
      const manifest = await readManifest();
      if (!manifest) {
        void vscode.window.showWarningMessage("Initialize a Fabric project first.");
        return;
      }

      const captured = await captureResource();
      if (!captured) {
        return;
      }

      await upsertResource(captured.key, captured.value);
      refreshAll();
      void vscode.window.showInformationMessage(
        `Recorded ${captured.key} in fabric.project.json.`
      );
    }),

    vscode.commands.registerCommand("datapassFabric.taskAction", async (taskId: string) => {
      const manifest = await readManifest();
      const task = manifest?.tasks.find(item => item.id === taskId);
      if (!manifest || !task) {
        void vscode.window.showWarningMessage("Checklist task not found.");
        return;
      }

      const choice = await vscode.window.showQuickPick(
        [
          {
            label: "$(play) Open / start this step",
            id: "open",
            description: task.target ? `Target: ${task.target}` : undefined,
            detail: task.description
          },
          {
            label: "$(sync) Mark in progress",
            id: "in_progress"
          },
          {
            label: "$(check) Mark done",
            id: "done"
          },
          {
            label: "$(error) Mark blocked",
            id: "blocked"
          },
          {
            label: "$(circle-large-outline) Reset to todo",
            id: "todo"
          }
        ],
        {
          title: task.title,
          placeHolder: `${task.phase} · current status: ${task.status}`
        }
      );

      if (!choice) {
        return;
      }

      if (choice.id === "open") {
        if (task.status === "todo") {
          await setTaskStatus(task.id, "in_progress");
        }
        const message = await runTaskTarget(task);
        refreshAll();
        void vscode.window.showInformationMessage(message);
        return;
      }

      await setTaskStatus(task.id, choice.id as TaskStatus);
      refreshAll();
    }),

    vscode.commands.registerCommand("datapassFabric.toggleTask", async (taskId: string) => {
      await toggleTask(taskId);
      refreshAll();
    }),

    vscode.commands.registerCommand("datapassFabric.showProjectSummary", async () => {
      const manifest = await readManifest();
      if (!manifest) {
        void vscode.window.showWarningMessage("Initialize a Fabric project first.");
        return;
      }

      const progress = getProgress(manifest);
      const next = progress.next?.title ?? "Checklist complete";
      const resources = Object.keys(manifest.resources).length;
      const action = await vscode.window.showInformationMessage(
        `${manifest.project.name}: ${progress.done}/${progress.total} complete (${progress.percent}%), ${resources} resources recorded. Next: ${next}.`,
        "Record resource",
        "Open manifest",
        "Export AI handoff",
        "Open Fabric"
      );

      if (action === "Record resource") {
        await vscode.commands.executeCommand("datapassFabric.recordResource");
      } else if (action === "Open manifest") {
        await vscode.commands.executeCommand("datapassFabric.openManifest");
      } else if (action === "Export AI handoff") {
        await vscode.commands.executeCommand("datapassFabric.exportHandoff");
      } else if (action === "Open Fabric") {
        await openFabricHome();
      }
    }),

    vscode.commands.registerCommand("datapassFabric.configureToolboxRoot", async () => {
      try {
        const selected = await configureToolboxRoot();
        if (selected) {
          refreshAll();
          void vscode.window.showInformationMessage(
            `Fabric Toolbox root configured: ${selected}`
          );
        }
      } catch (error) {
        void vscode.window.showErrorMessage(toMessage(error));
      }
    }),

    vscode.commands.registerCommand("datapassFabric.openMcpConfig", async () => {
      try {
        await openWorkspaceMcpConfig();
        refreshAll();
      } catch (error) {
        void vscode.window.showErrorMessage(toMessage(error));
      }
    }),

    vscode.commands.registerCommand("datapassFabric.refresh", refreshAll),

    vscode.commands.registerCommand("datapassFabric.openFabric", openFabricHome),

    vscode.commands.registerCommand("datapassFabric.exportHandoff", async () => {
      const manifest = await readManifest();
      if (!manifest) {
        void vscode.window.showWarningMessage("Initialize a Fabric project first.");
        return;
      }

      try {
        const uri = await exportHandoff(manifest);
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, { preview: false });
      } catch (error) {
        void vscode.window.showErrorMessage(toMessage(error));
      }
    })
  );

  const manifestWatcher = vscode.workspace.createFileSystemWatcher("**/fabric.project.json");
  manifestWatcher.onDidChange(refreshAll);
  manifestWatcher.onDidCreate(refreshAll);
  manifestWatcher.onDidDelete(refreshAll);

  const vscodeMcpWatcher = vscode.workspace.createFileSystemWatcher("**/.vscode/mcp.json");
  vscodeMcpWatcher.onDidChange(refreshAll);
  vscodeMcpWatcher.onDidCreate(refreshAll);
  vscodeMcpWatcher.onDidDelete(refreshAll);

  const portableMcpWatcher = vscode.workspace.createFileSystemWatcher("**/.mcp.json");
  portableMcpWatcher.onDidChange(refreshAll);
  portableMcpWatcher.onDidCreate(refreshAll);
  portableMcpWatcher.onDidDelete(refreshAll);

  context.subscriptions.push(manifestWatcher, vscodeMcpWatcher, portableMcpWatcher);
  refreshAll();
}

export function deactivate(): void {}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
