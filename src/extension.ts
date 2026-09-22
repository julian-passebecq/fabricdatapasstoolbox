import * as vscode from "vscode";
import { ChecklistProvider } from "./checklistProvider";
import {
  exportHandoff,
  initializeFoilProject,
  manifestUri,
  readManifest,
  toggleTask
} from "./projectState";
import { ToolboxViewProvider } from "./toolboxPanel";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const checklist = new ChecklistProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("datapassFabric.checklist", checklist),
    vscode.window.registerWebviewViewProvider(
      ToolboxViewProvider.viewType,
      new ToolboxViewProvider(context.extensionUri)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("datapassFabric.initializeProject", async () => {
      try {
        const manifest = await initializeFoilProject();
        checklist.refresh();
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

    vscode.commands.registerCommand("datapassFabric.toggleTask", async (taskId: string) => {
      await toggleTask(taskId);
      checklist.refresh();
    }),

    vscode.commands.registerCommand("datapassFabric.refresh", () => checklist.refresh()),

    vscode.commands.registerCommand("datapassFabric.openFabric", async () => {
      const core = vscode.extensions.getExtension("fabric.vscode-fabric");
      if (core) {
        try {
          await vscode.commands.executeCommand(
            "workbench.view.extension.vscode-fabric_view_workspace"
          );
          return;
        } catch {
          // Fall through to the portal when the core view id changes.
        }
      }
      await vscode.env.openExternal(vscode.Uri.parse("https://app.fabric.microsoft.com/"));
    }),

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

  const watcher = vscode.workspace.createFileSystemWatcher("**/fabric.project.json");
  watcher.onDidChange(() => checklist.refresh());
  watcher.onDidCreate(() => checklist.refresh());
  watcher.onDidDelete(() => checklist.refresh());
  context.subscriptions.push(watcher);
}

export function deactivate(): void {}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
