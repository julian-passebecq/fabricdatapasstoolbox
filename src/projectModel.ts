export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface FabricTask {
  id: string;
  title: string;
  phase: string;
  status: TaskStatus;
  description?: string;
  target?: "vscode" | "fabric" | "toolbox";
  resourceKey?: string;
  dependsOn?: string[];
}

export interface FabricResource {
  name?: string;
  id?: string;
  notes?: string;
}

export interface FabricProjectManifest {
  schemaVersion: 1;
  project: {
    name: string;
    type: string;
    environment: string;
    createdAt: string;
    updatedAt: string;
  };
  architecture: {
    source: string[];
    ingestion: string[];
    storage: string[];
    layers: string[];
    serving: string[];
  };
  resources: Record<string, FabricResource>;
  tasks: FabricTask[];
  decisions: Array<{ decision: string; reason: string; at: string }>;
}

export interface ProjectProgress {
  done: number;
  total: number;
  percent: number;
  next?: FabricTask;
}

export interface ProjectIssue {
  code: "done_resource_missing" | "dependency_incomplete";
  taskId: string;
  resourceKey?: string;
  dependencyId?: string;
  message: string;
}

export const MANIFEST_NAME = "fabric.project.json";

export function defaultFoilManifest(now = new Date().toISOString()): FabricProjectManifest {
  return {
    schemaVersion: 1,
    project: {
      name: "foil-wind",
      type: "realtime-medallion",
      environment: "dev",
      createdAt: now,
      updatedAt: now
    },
    architecture: {
      source: ["oracle-vm", "kafka"],
      ingestion: ["eventstream"],
      storage: ["eventhouse", "lakehouse"],
      layers: ["bronze", "silver", "gold"],
      serving: ["sql", "power-bi"]
    },
    resources: {},
    tasks: [
      {
        id: "fabric-login",
        title: "Sign in to Microsoft Fabric",
        phase: "Foundation",
        status: "todo",
        target: "vscode",
        description: "Authenticate through the official Microsoft Fabric VS Code extension."
      },
      {
        id: "workspace",
        title: "Create or select Fabric workspace",
        phase: "Foundation",
        status: "todo",
        dependsOn: ["fabric-login"],
        target: "fabric",
        resourceKey: "workspace",
        description: "Create the Foil'o development workspace or select the workspace that will own this project."
      },
      {
        id: "git",
        title: "Connect project source control",
        phase: "Foundation",
        status: "todo",
        dependsOn: ["workspace"],
        target: "vscode",
        description: "Keep project definitions and Datapass state under Git so changes and decisions remain inspectable."
      },
      {
        id: "eventstream",
        title: "Create Eventstream for turbine telemetry",
        phase: "Ingestion",
        status: "todo",
        dependsOn: ["workspace"],
        target: "fabric",
        resourceKey: "eventstream",
        description: "Receive the wind-turbine event stream that will ultimately come from the Oracle VM / Kafka simulator."
      },
      {
        id: "eventhouse",
        title: "Configure Eventhouse / KQL destination",
        phase: "Ingestion",
        status: "todo",
        dependsOn: ["eventstream"],
        target: "fabric",
        resourceKey: "eventhouse",
        description: "Persist and query real-time telemetry through Eventhouse / KQL."
      },
      {
        id: "lakehouse",
        title: "Create Lakehouse",
        phase: "Medallion",
        status: "todo",
        dependsOn: ["workspace"],
        target: "fabric",
        resourceKey: "lakehouse",
        description: "Create the Lakehouse used for the Bronze, Silver and Gold learning path."
      },
      {
        id: "bronze",
        title: "Implement Bronze ingestion",
        phase: "Medallion",
        status: "todo",
        dependsOn: ["eventstream","lakehouse"],
        target: "fabric",
        resourceKey: "notebook-bronze",
        description: "Land raw telemetry with minimal transformation and enough metadata for replay/debugging."
      },
      {
        id: "silver",
        title: "Implement Silver transformations",
        phase: "Medallion",
        status: "todo",
        dependsOn: ["bronze"],
        target: "fabric",
        resourceKey: "notebook-silver",
        description: "Clean, type, deduplicate and enrich turbine telemetry into reusable analytical tables."
      },
      {
        id: "gold",
        title: "Build Gold business tables",
        phase: "Medallion",
        status: "todo",
        dependsOn: ["silver"],
        target: "fabric",
        resourceKey: "notebook-gold",
        description: "Create KPI-ready aggregates such as production, availability and turbine health summaries."
      },
      {
        id: "semantic-model",
        title: "Create semantic model",
        phase: "Serving",
        status: "todo",
        dependsOn: ["gold"],
        target: "fabric",
        resourceKey: "semantic-model",
        description: "Model Gold data for reporting with explicit business measures and relationships."
      },
      {
        id: "power-bi",
        title: "Create Power BI report",
        phase: "Serving",
        status: "todo",
        dependsOn: ["semantic-model"],
        target: "fabric",
        resourceKey: "report",
        description: "Build the final operational/business report from the curated semantic layer."
      },
      {
        id: "monitoring",
        title: "Configure monitoring",
        phase: "Operations",
        status: "todo",
        dependsOn: ["eventstream","lakehouse"],
        target: "toolbox",
        description: "Select the useful Fabric Toolbox monitoring assets instead of recreating monitoring from scratch."
      },
      {
        id: "deployment",
        title: "Configure deployment / CI-CD",
        phase: "Operations",
        status: "todo",
        dependsOn: ["git","power-bi"],
        target: "toolbox",
        resourceKey: "deployment-pipeline",
        description: "Define promotion and deployment flow once the development architecture is stable."
      }
    ],
    decisions: [
      {
        decision: "Use Eventstream for real-time turbine ingestion",
        reason: "The Foil'o case is real-time telemetry and should exercise Fabric RTI instead of only batch pipelines.",
        at: now
      },
      {
        decision: "Keep both Eventhouse and Lakehouse",
        reason: "Eventhouse supports KQL/real-time investigation while Lakehouse supports the Bronze/Silver/Gold learning path.",
        at: now
      }
    ]
  };
}

export function getUnmetDependencies(
  manifest: FabricProjectManifest,
  task: FabricTask
): FabricTask[] {
  const tasksById = new Map(manifest.tasks.map(candidate => [candidate.id, candidate]));
  return (task.dependsOn ?? [])
    .map(dependencyId => tasksById.get(dependencyId))
    .filter((dependency): dependency is FabricTask => dependency !== undefined && dependency.status !== "done");
}

export function getReadyTasks(manifest: FabricProjectManifest): FabricTask[] {
  return manifest.tasks.filter(
    task => task.status !== "done" && getUnmetDependencies(manifest, task).length === 0
  );
}

export function getProgress(manifest: FabricProjectManifest): ProjectProgress {
  const done = manifest.tasks.filter(task => task.status === "done").length;
  const total = manifest.tasks.length;
  const ready = getReadyTasks(manifest);
  const next =
    ready.find(task => task.status === "in_progress") ??
    ready.find(task => task.status === "todo") ??
    ready.find(task => task.status === "blocked") ??
    manifest.tasks.find(task => task.status !== "done");

  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    next
  };
}

export function getProjectIssues(manifest: FabricProjectManifest): ProjectIssue[] {
  const tasksById = new Map(manifest.tasks.map(task => [task.id, task]));
  const issues: ProjectIssue[] = [];

  for (const task of manifest.tasks) {
    if (task.status === "done" && task.resourceKey && !manifest.resources[task.resourceKey]) {
      issues.push({
        code: "done_resource_missing",
        taskId: task.id,
        resourceKey: task.resourceKey,
        message: `Task "${task.title}" is done but resource "${task.resourceKey}" is not recorded.`
      });
    }

    if (task.status === "done" || task.status === "in_progress") {
      for (const dependencyId of task.dependsOn ?? []) {
        const dependency = tasksById.get(dependencyId);
        if (!dependency || dependency.status !== "done") {
          issues.push({
            code: "dependency_incomplete",
            taskId: task.id,
            dependencyId,
            message: `Task "${task.title}" is ${task.status.replace("_", " ")} but dependency "${dependency?.title ?? dependencyId}" is not done.`
          });
        }
      }
    }
  }

  return issues;
}

export function renderHandoff(manifest: FabricProjectManifest): string {
  const completed = manifest.tasks.filter(task => task.status === "done");
  const current = manifest.tasks.filter(task => task.status === "in_progress");
  const remaining = manifest.tasks.filter(task => task.status === "todo" || task.status === "blocked");
  const progress = getProgress(manifest);
  const issues = getProjectIssues(manifest);
  const architecture = [
    ...manifest.architecture.source,
    ...manifest.architecture.ingestion,
    ...manifest.architecture.storage,
    ...manifest.architecture.layers,
    ...manifest.architecture.serving
  ].join(" -> ");

  const taskLines = (tasks: FabricTask[]) => tasks.length
    ? tasks.map(task => {
        const resourceState = task.resourceKey
          ? manifest.resources[task.resourceKey]
            ? ` · resource: ${task.resourceKey} recorded`
            : ` · resource: ${task.resourceKey} missing`
          : "";
        return `- ${task.title} (${task.phase})${resourceState}`;
      }).join("\n")
    : "- None";

  const resourceEntries = Object.entries(manifest.resources);
  const resources = resourceEntries.length
    ? resourceEntries
        .map(([key, value]) => `- **${key}**: ${value.name ?? "(unnamed)"}${value.id ? ` — ${value.id}` : ""}${value.notes ? ` — ${value.notes}` : ""}`)
        .join("\n")
    : "- None recorded yet";

  const readyNow = getReadyTasks(manifest);
  const validation = issues.length
    ? issues.map(issue => `- ${issue.message}`).join("\n")
    : "- No task/resource or dependency-sequencing issues detected";

  return `# Fabric project handoff: ${manifest.project.name}

## Project
- Type: ${manifest.project.type}
- Environment: ${manifest.project.environment}
- Progress: ${progress.done}/${progress.total} (${progress.percent}%)
- Last updated: ${manifest.project.updatedAt}

## Architecture
${architecture}

## Next action
${progress.next ? `- ${progress.next.title} (${progress.next.phase}) — status: ${progress.next.status}` : "- Project checklist complete"}

## Ready now
${readyNow.length ? readyNow.map(task => `- ${task.title} (${task.phase}) — status: ${task.status}`).join("\n") : "- None"}

## Completed
${taskLines(completed)}

## In progress
${taskLines(current)}

## Remaining
${taskLines(remaining)}

## Resources
${resources}

## Validation
${validation}

## Decisions
${manifest.decisions.map(item => `- **${item.decision}** — ${item.reason}`).join("\n") || "- None"}

## Machine-readable state
The authoritative state is \`${MANIFEST_NAME}\`. Read that JSON before changing this project.
`;
}
