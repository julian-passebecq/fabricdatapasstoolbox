import * as vscode from "vscode";
import { FabricProjectManifest, FabricTask, readManifest } from "./projectState";

type ChecklistNode = PhaseNode | TaskNode | InfoNode;

interface PhaseNode {
  kind: "phase";
  phase: string;
  tasks: FabricTask[];
}

interface TaskNode {
  kind: "task";
  task: FabricTask;
}

interface InfoNode {
  kind: "info";
  label: string;
  command?: vscode.Command;
}

export class ChecklistProvider implements vscode.TreeDataProvider<ChecklistNode> {
  private readonly changed = new vscode.EventEmitter<ChecklistNode | undefined | null | void>();
  readonly onDidChangeTreeData = this.changed.event;

  refresh(): void {
    this.changed.fire();
  }

  getTreeItem(element: ChecklistNode): vscode.TreeItem {
    if (element.kind === "phase") {
      const done = element.tasks.filter(task => task.status === "done").length;
      const item = new vscode.TreeItem(
        `${element.phase}  ${done}/${element.tasks.length}`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.contextValue = "datapassFabric.phase";
      return item;
    }

    if (element.kind === "info") {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.command = element.command;
      return item;
    }

    const task = element.task;
    const icon = task.status === "done"
      ? "pass-filled"
      : task.status === "blocked"
        ? "error"
        : task.status === "in_progress"
          ? "sync~spin"
          : "circle-large-outline";

    const item = new vscode.TreeItem(task.title, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(icon);
    item.contextValue = "datapassFabric.task";
    item.description = task.status.replace("_", " ");
    item.tooltip = new vscode.MarkdownString(
      `**${task.phase}**\n\nStatus: ${task.status}\n\n${task.description ?? ""}`
    );
    item.command = {
      command: "datapassFabric.toggleTask",
      title: "Toggle checklist task",
      arguments: [task.id]
    };
    return item;
  }

  async getChildren(element?: ChecklistNode): Promise<ChecklistNode[]> {
    const manifest = await readManifest();
    if (!manifest) {
      return element
        ? []
        : [{
            kind: "info",
            label: "Initialize Foil'o Fabric project",
            command: {
              command: "datapassFabric.initializeProject",
              title: "Initialize Fabric Project"
            }
          }];
    }

    if (!element) {
      return this.phaseNodes(manifest);
    }

    if (element.kind === "phase") {
      return element.tasks.map(task => ({ kind: "task", task }));
    }

    return [];
  }

  private phaseNodes(manifest: FabricProjectManifest): PhaseNode[] {
    const phases = new Map<string, FabricTask[]>();
    for (const task of manifest.tasks) {
      const tasks = phases.get(task.phase) ?? [];
      tasks.push(task);
      phases.set(task.phase, tasks);
    }

    return [...phases.entries()].map(([phase, tasks]) => ({
      kind: "phase",
      phase,
      tasks
    }));
  }
}
