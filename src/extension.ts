import * as vscode from "vscode";
import { ChecklistProvider } from "./checklistProvider";
import { openFabricHome, runTaskTarget } from "./fabricIntegration";
import {
  exportHandoff,
  getProgress,
  getProjectIssues,
  getUnmetDependencies,
  initializeProject,
  manifestUri,
  readManifest,
  readManifestResult,
  setTaskStatus,
  TaskStatus,
  upsertResource
} from "./projectState";
import { captureResource } from "./resourceCapture";
import { ToolboxViewProvider } from "./toolboxPanel";
import { configureToolboxRoot, openWorkspaceMcpConfig } from "./toolRunners";
import { PROJECT_TEMPLATES, ProjectTemplateId } from "./projectTemplates";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const checklist = new ChecklistProvider();
  const toolbox = new ToolboxViewProvider(context.extensionUri);

  const refreshAll = (): void => {
    checklist.refresh();
    void toolbox.refresh();
  };

  const recordLinkedResource = async (
    taskId: string,
    resourceKey: string,
    promptToComplete: boolean
  ): Promise<boolean> => {
    const captured = await captureResource(resourceKey);
    if (!captured) {
      return false;
    }

    await upsertResource(captured.key, captured.value);

    if (promptToComplete) {
      const action = await vscode.window.showInformationMessage(
        `Recorded ${resourceKey}. Mark the linked checklist task done?`,
        "Mark task done",
        "Keep current status"
      );
      if (action === "Mark task done") {
        await setTaskStatus(taskId, "done");
      }
    }

    refreshAll();
    return true;
  };

  const completeTaskWithResourceGuard = async (
    taskId: string
  ): Promise<void> => {
    const manifest = await readManifest();
    const task = manifest?.tasks.find(item => item.id === taskId);
    if (!manifest || !task) {
      void vscode.window.showWarningMessage("Checklist task not found.");
      return;
    }

    const unmetDependencies = getUnmetDependencies(manifest, task);
    if (unmetDependencies.length) {
      const action = await vscode.window.showWarningMessage(
        `"${task.title}" is blocked by ${unmetDependencies.map(item => `"${item.title}"`).join(", ")}.`,
        "Open first dependency",
        "Mark done anyway"
      );

      if (action === "Open first dependency") {
        await vscode.commands.executeCommand(
          "datapassFabric.taskAction",
          unmetDependencies[0].id
        );
        return;
      }

      if (action !== "Mark done anyway") {
        return;
      }
    }

    if (task.resourceKey && !manifest.resources[task.resourceKey]) {
      const action = await vscode.window.showWarningMessage(
        `No "${task.resourceKey}" resource is recorded for "${task.title}".`,
        "Record resource",
        "Mark done anyway"
      );

      if (action === "Record resource") {
        const recorded = await recordLinkedResource(task.id, task.resourceKey, false);
        if (!recorded) {
          return;
        }
      } else if (action !== "Mark done anyway") {
        return;
      }
    }

    await setTaskStatus(task.id, "done");
    refreshAll();
  };

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("datapassFabric.checklist", checklist),
    vscode.window.registerWebviewViewProvider(ToolboxViewProvider.viewType, toolbox)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("datapassFabric.initializeProject", async () => {
      try {
        const existing = await readManifestResult();
        if (existing.exists) {
          if (existing.manifest) {
            void vscode.window.showInformationMessage(
              `Fabric project '${existing.manifest.project.name}' is already initialized in this folder.`
            );
          } else {
            void vscode.window.showErrorMessage(
              `Existing fabric.project.json is invalid: ${existing.errors.join(" ")}`
            );
            await vscode.commands.executeCommand("datapassFabric.openManifest");
          }
          return;
        }

        const choice = await vscode.window.showQuickPick(
          PROJECT_TEMPLATES.map(template => ({
            label: template.name,
            description: `v${template.version}`,
            detail: template.description,
            templateId: template.id
          })),
          {
            title: "Initialize Datapass Fabric project",
            placeHolder: "Choose the architecture you want to practice"
          }
        );
        if (!choice) {
          return;
        }

        const manifest = await initializeProject(choice.templateId as ProjectTemplateId);
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
      const linkedTask = manifest.tasks.find(
        task => task.resourceKey === captured.key && task.status !== "done"
      );

      if (linkedTask) {
        const action = await vscode.window.showInformationMessage(
          `Recorded ${captured.key}. Mark "${linkedTask.title}" done?`,
          "Mark task done",
          "Keep current status"
        );
        if (action === "Mark task done") {
          await setTaskStatus(linkedTask.id, "done");
        }
      }

      refreshAll();
      void vscode.window.showInformationMessage(
        `Recorded ${captured.key} in fabric.project.json.`
      );
    }),

    vscode.commands.registerCommand("datapassFabric.validateProject", async () => {
      const readResult = await readManifestResult();
      if (!readResult.exists) {
        void vscode.window.showWarningMessage("Initialize a Fabric project first.");
        return;
      }
      if (!readResult.manifest) {
        const action = await vscode.window.showErrorMessage(
          `Project manifest is invalid. ${readResult.errors.join(" ")}`,
          "Open manifest"
        );
        if (action === "Open manifest") {
          await vscode.commands.executeCommand("datapassFabric.openManifest");
        }
        return;
      }

      const manifest = readResult.manifest;
      const issues = getProjectIssues(manifest);
      if (issues.length === 0) {
        void vscode.window.showInformationMessage(
          "Project state is consistent: resource links and task sequencing are valid."
        );
        return;
      }

      const first = issues[0];
      const action = await vscode.window.showWarningMessage(
        `${issues.length} project-state issue${issues.length === 1 ? "" : "s"} detected. ${first.message}`,
        "Open task",
        "Open manifest"
      );

      if (action === "Open task") {
        await vscode.commands.executeCommand("datapassFabric.taskAction", first.taskId);
      } else if (action === "Open manifest") {
        await vscode.commands.executeCommand("datapassFabric.openManifest");
      }
    }),

    vscode.commands.registerCommand("datapassFabric.taskAction", async (taskId: string) => {
      const manifest = await readManifest();
      const task = manifest?.tasks.find(item => item.id === taskId);
      if (!manifest || !task) {
        void vscode.window.showWarningMessage("Checklist task not found.");
        return;
      }

      const resourceRecorded = task.resourceKey
        ? Boolean(manifest.resources[task.resourceKey])
        : false;

      const actions = [
        {
          label: "$(play) Open / start this step",
          id: "open",
          description: task.target ? `Target: ${task.target}` : undefined,
          detail: task.description
        },
        ...(task.resourceKey
          ? [{
              label: resourceRecorded
                ? `$(database) Update linked resource: ${task.resourceKey}`
                : `$(database) Record linked resource: ${task.resourceKey}`,
              id: "resource"
            }]
          : []),
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
      ];

      const choice = await vscode.window.showQuickPick(actions, {
        title: task.title,
        placeHolder: `${task.phase} · current status: ${task.status}`
      });

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

      if (choice.id === "resource" && task.resourceKey) {
        await recordLinkedResource(task.id, task.resourceKey, task.status !== "done");
        return;
      }

      if (choice.id === "done") {
        await completeTaskWithResourceGuard(task.id);
        return;
      }

      await setTaskStatus(task.id, choice.id as TaskStatus);
      refreshAll();
    }),

    vscode.commands.registerCommand("datapassFabric.toggleTask", async (taskId: string) => {
      const manifest = await readManifest();
      const task = manifest?.tasks.find(item => item.id === taskId);
      if (!manifest || !task) {
        void vscode.window.showWarningMessage("Checklist task not found.");
        return;
      }

      if (task.status === "done") {
        await setTaskStatus(task.id, "todo");
        refreshAll();
        return;
      }

      await completeTaskWithResourceGuard(task.id);
    }),

    vscode.commands.registerCommand("datapassFabric.showProjectSummary", async () => {
      const manifest = await readManifest();
      if (!manifest) {
        void vscode.window.showWarningMessage("Initialize a Fabric project first.");
        return;
      }

      const progress = getProgress(manifest);
      const issues = getProjectIssues(manifest);
      const next = progress.next?.title ?? "Checklist complete";
      const resources = Object.keys(manifest.resources).length;
      const issueText = issues.length
        ? `, ${issues.length} validation issue${issues.length === 1 ? "" : "s"}`
        : "";
      const action = await vscode.window.showInformationMessage(
        `${manifest.project.name}: ${progress.done}/${progress.total} complete (${progress.percent}%), ${resources} resources recorded${issueText}. Next: ${next}.`,
        "Record resource",
        "Validate",
        "Open manifest",
        "Export AI handoff",
        "Open Fabric"
      );

      if (action === "Record resource") {
        await vscode.commands.executeCommand("datapassFabric.recordResource");
      } else if (action === "Validate") {
        await vscode.commands.executeCommand("datapassFabric.validateProject");
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
