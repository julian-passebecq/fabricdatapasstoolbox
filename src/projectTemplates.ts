import {
  defaultFoilManifest,
  FabricProjectManifest
} from "./projectModel";

export type ProjectTemplateId = "foil-wind-realtime" | "contoso-batch-medallion";

export interface ProjectTemplateDefinition {
  id: ProjectTemplateId;
  name: string;
  description: string;
  version: number;
}

export const PROJECT_TEMPLATES: ProjectTemplateDefinition[] = [
  {
    id: "foil-wind-realtime",
    name: "Foil'o Wind — Real-time Fabric",
    description: "Oracle VM / Kafka -> Eventstream -> Eventhouse + Lakehouse -> Medallion -> Power BI.",
    version: 1
  },
  {
    id: "contoso-batch-medallion",
    name: "Contoso — Batch Data Factory",
    description: "Contoso data -> Fabric Data Pipeline -> Lakehouse/Warehouse -> Medallion -> Power BI.",
    version: 1
  }
];

export function createProjectFromTemplate(
  templateId: ProjectTemplateId,
  now = new Date().toISOString()
): FabricProjectManifest {
  if (templateId === "contoso-batch-medallion") {
    return defaultContosoManifest(now);
  }

  return defaultFoilManifest(now);
}

export function defaultContosoManifest(
  now = new Date().toISOString()
): FabricProjectManifest {
  return {
    schemaVersion: 1,
    project: {
      name: "contoso-fabric",
      type: "batch-medallion",
      environment: "dev",
      templateId: "contoso-batch-medallion",
      templateVersion: 1,
      createdAt: now,
      updatedAt: now
    },
    architecture: {
      source: ["contoso-generator", "files", "sql"],
      ingestion: ["data-pipeline"],
      storage: ["lakehouse", "warehouse"],
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
        description: "Create or select the Fabric workspace that will own the Contoso batch project."
      },
      {
        id: "git",
        title: "Connect project source control",
        phase: "Foundation",
        status: "todo",
        dependsOn: ["workspace"],
        target: "vscode",
        description: "Connect the workspace/project definitions to Git for inspectable changes and deployment."
      },
      {
        id: "lakehouse",
        title: "Create Lakehouse",
        phase: "Storage",
        status: "todo",
        dependsOn: ["workspace"],
        target: "fabric",
        resourceKey: "lakehouse",
        description: "Create the Lakehouse that will store Bronze, Silver and Gold tables."
      },
      {
        id: "pipeline",
        title: "Create Fabric Data Pipeline",
        phase: "Ingestion",
        status: "todo",
        dependsOn: ["workspace"],
        target: "fabric",
        resourceKey: "data-pipeline",
        description: "Build a batch ingestion pipeline for Contoso files/SQL sources into Fabric."
      },
      {
        id: "bronze",
        title: "Implement Bronze ingestion",
        phase: "Medallion",
        status: "todo",
        dependsOn: ["pipeline", "lakehouse"],
        target: "fabric",
        resourceKey: "notebook-bronze",
        description: "Land raw Contoso data with minimal transformation and ingestion metadata."
      },
      {
        id: "silver",
        title: "Implement Silver transformations",
        phase: "Medallion",
        status: "todo",
        dependsOn: ["bronze"],
        target: "fabric",
        resourceKey: "notebook-silver",
        description: "Clean, type, deduplicate and join the raw Contoso entities into reusable analytical tables."
      },
      {
        id: "gold",
        title: "Build Gold business tables",
        phase: "Medallion",
        status: "todo",
        dependsOn: ["silver"],
        target: "fabric",
        resourceKey: "notebook-gold",
        description: "Create KPI-ready facts and dimensions for sales, customers, products and operations."
      },
      {
        id: "warehouse",
        title: "Create Fabric Warehouse serving layer",
        phase: "Serving",
        status: "todo",
        dependsOn: ["gold"],
        target: "fabric",
        resourceKey: "warehouse",
        description: "Expose curated Gold data through a SQL-oriented serving layer for BI and interview practice."
      },
      {
        id: "semantic-model",
        title: "Create semantic model",
        phase: "Serving",
        status: "todo",
        dependsOn: ["warehouse"],
        target: "fabric",
        resourceKey: "semantic-model",
        description: "Create relationships, measures and business semantics on top of curated Contoso data."
      },
      {
        id: "power-bi",
        title: "Create Power BI report",
        phase: "Serving",
        status: "todo",
        dependsOn: ["semantic-model"],
        target: "fabric",
        resourceKey: "report",
        description: "Build a report that explains the business KPIs produced by the Gold/semantic layers."
      },
      {
        id: "monitoring",
        title: "Configure monitoring",
        phase: "Operations",
        status: "todo",
        dependsOn: ["pipeline", "lakehouse"],
        target: "toolbox",
        description: "Add the relevant Fabric monitoring assets for batch pipelines, Spark and cost."
      },
      {
        id: "deployment",
        title: "Configure deployment / CI-CD",
        phase: "Operations",
        status: "todo",
        dependsOn: ["git", "power-bi"],
        target: "toolbox",
        resourceKey: "deployment-pipeline",
        description: "Define promotion from development to later environments after the batch project is stable."
      }
    ],
    decisions: [
      {
        decision: "Use Fabric Data Pipeline for Contoso ingestion",
        reason: "This template is the batch/Data Factory counterpart to the Foil'o real-time Eventstream template.",
        at: now
      },
      {
        decision: "Use both Lakehouse and Warehouse",
        reason: "The template should practice Spark/medallion engineering and SQL-oriented Fabric serving in one project.",
        at: now
      }
    ]
  };
}


export type ProjectTemplateStatusKind =
  | "custom"
  | "unknown"
  | "unversioned"
  | "current"
  | "outdated"
  | "ahead";

export interface ProjectTemplateStatus {
  kind: ProjectTemplateStatusKind;
  templateId?: string;
  templateName?: string;
  projectVersion?: number;
  currentVersion?: number;
}

export function getProjectTemplateStatus(
  manifest: FabricProjectManifest
): ProjectTemplateStatus {
  const templateId = manifest.project.templateId;
  const projectVersion = manifest.project.templateVersion;

  if (!templateId) {
    return { kind: "custom" };
  }

  const template = PROJECT_TEMPLATES.find(candidate => candidate.id === templateId);
  if (!template) {
    return {
      kind: "unknown",
      templateId,
      projectVersion
    };
  }

  if (!projectVersion) {
    return {
      kind: "unversioned",
      templateId,
      templateName: template.name,
      currentVersion: template.version
    };
  }

  const kind: ProjectTemplateStatusKind =
    projectVersion < template.version
      ? "outdated"
      : projectVersion > template.version
        ? "ahead"
        : "current";

  return {
    kind,
    templateId,
    templateName: template.name,
    projectVersion,
    currentVersion: template.version
  };
}
