import * as vscode from "vscode";
import {
  FabricProjectManifest,
  FabricTask,
  getProgress,
  getProjectIssues,
  readManifest
} from "./projectState";

type ChecklistNode = ProjectNode | NextNode | PhaseNode | TaskNode | InfoNode;

interface ProjectNode {
  kind: "project";
  manifest: FabricProjectManifest;
}

interface NextNode {
  kind: "next";
  task: FabricTask;
}

interface PhaseNode {
  kind: "phase";
  phase: string;
  tasks: FabricTask[];
}

interface TaskNode {
  kind: "task";
  task: FabricTask;
  resourceRecorded: boolean;
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
    if (element.kind === "project") {
      const progress = getProgress(element.manifest);
      const resourceCount = Object.keys(element.manifest.resources).length;
      const issues = getProjectIssues(element.manifest);
      const item = new vscode.TreeItem(
        element.manifest.project.name,
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon(issues.length ? "warning" : "graph");
      item.description = `${progress.done}/${progress.total} · ${progress.percent}% · ${resourceCount} resources${issues.length ? ` · ${issues.length} issue${issues.length === 1 ? "" : "s"}` : ""}`;
      item.tooltip = new vscode.MarkdownString(
        `**${element.manifest.project.name}**\n\nType: ${element.manifest.project.type}\n\nEnvironment: ${element.manifest.project.environment}\n\nProgress: ${progress.percent}%\n\nResources recorded: ${resourceCount}\n\nValidation issues: ${issues.length}`
      );
      item.command = {
        command: "datapassFabric.showProjectSummary",
        title: "Show project summary"
      };
      return item;
    }

    if (element.kind === "next") {
      const item = new vscode.TreeItem(
        `Next: ${element.task.title}`,
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon("arrow-right");
      item.description = element.task.phase;
      item.tooltip = element.task.description;
      item.command = {
        command: "datapassFabric.taskAction",
        title: "Open next task",
        arguments: [element.task.id]
      };
      return item;
    }

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
    const inconsistent = task.status === "done" && Boolean(task.resourceKey) && !element.resourceRecorded;
    const icon = inconsistent
      ? "warning"
      : task.status === "done"
        ? "pass-filled"
        : task.status === "blocked"
          ? "error"
          : task.status === "in_progress"
            ? "sync~spin"
            : "circle-large-outline";

    const resourceDescription = task.resourceKey
      ? element.resourceRecorded
        ? " · resource recorded"
        : " · resource missing"
      : "";

    const item = new vscode.TreeItem(task.title, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(icon);
    item.contextValue = "datapassFabric.task";
    item.description = `${task.status.replace("_", " ")}${resourceDescription}`;
    item.tooltip = new vscode.MarkdownString(
      `**${task.phase}**\n\nStatus: ${task.status}\n\n${task.description ?? ""}${task.dependsOn?.length ? `\n\nDepends on: ${task.dependsOn.join(", ")}` : ""}${task.resourceKey ? `\n\nLinked resource: **${task.resourceKey}** — ${element.resourceRecorded ? "recorded" : "missing"}` : ""}`
    );
    item.command = {
      command: "datapassFabric.taskAction",
      title: "Open checklist task",
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
      const progress = getProgress(manifest);
      const nodes: ChecklistNode[] = [{ kind: "project", manifest }];
      if (progress.next) {
        nodes.push({ kind: "next", task: progress.next });
      }
      nodes.push(...this.phaseNodes(manifest));
      return nodes;
    }

    if (element.kind === "phase") {
      return element.tasks.map(task => ({
        kind: "task",
        task,
        resourceRecorded: task.resourceKey ? Boolean(manifest.resources[task.resourceKey]) : false
      }));
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
