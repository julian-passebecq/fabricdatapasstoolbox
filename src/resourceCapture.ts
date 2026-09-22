import * as vscode from "vscode";

export interface CapturedResource {
  key: string;
  value: {
    name?: string;
    id?: string;
    notes?: string;
  };
}

interface ResourceChoice extends vscode.QuickPickItem {
  key: string;
}

const resourceChoices: ResourceChoice[] = [
  { key: "workspace", label: "$(organization) Workspace", description: "Fabric workspace" },
  { key: "eventstream", label: "$(radio-tower) Eventstream", description: "Real-time ingestion" },
  { key: "eventhouse", label: "$(database) Eventhouse", description: "KQL / real-time store" },
  { key: "lakehouse", label: "$(database) Lakehouse", description: "Medallion storage" },
  { key: "notebook-bronze", label: "$(notebook) Bronze notebook", description: "Raw ingestion" },
  { key: "notebook-silver", label: "$(notebook) Silver notebook", description: "Cleaning / enrichment" },
  { key: "notebook-gold", label: "$(notebook) Gold notebook", description: "Business aggregates" },
  { key: "semantic-model", label: "$(symbol-structure) Semantic model", description: "BI semantic layer" },
  { key: "report", label: "$(graph) Power BI report", description: "Serving / visualization" },
  { key: "deployment-pipeline", label: "$(debug-step-over) Deployment pipeline", description: "Promotion / CI-CD" }
];

export async function captureResource(): Promise<CapturedResource | undefined> {
  const choice = await vscode.window.showQuickPick(resourceChoices, {
    title: "Record Fabric resource",
    placeHolder: "Choose the resource type to store in fabric.project.json"
  });
  if (!choice) {
    return undefined;
  }

  const name = await vscode.window.showInputBox({
    title: `Record ${choice.label.replace(/^\$\([^)]*\)\s*/, "")}`,
    prompt: "Display name (recommended)",
    placeHolder: "foil-dev"
  });
  if (name === undefined) {
    return undefined;
  }

  const locator = await vscode.window.showInputBox({
    title: "Fabric ID or URL",
    prompt: "Paste a Fabric GUID or item URL. You can leave this blank and fill it later.",
    placeHolder: "https://app.fabric.microsoft.com/groups/<workspace-id>/..."
  });
  if (locator === undefined) {
    return undefined;
  }

  const trimmedName = name.trim();
  const trimmedLocator = locator.trim();
  const id = trimmedLocator ? extractFabricId(choice.key, trimmedLocator) : undefined;

  return {
    key: choice.key,
    value: {
      name: trimmedName || undefined,
      id,
      notes: trimmedLocator && trimmedLocator !== id ? `Source: ${trimmedLocator}` : undefined
    }
  };
}

export function extractFabricId(resourceKey: string, locator: string): string | undefined {
  const trimmed = locator.trim();
  const guidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
  const exactGuid = new RegExp(`^${guidPattern}$`);
  if (exactGuid.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const pathname = decodeURIComponent(url.pathname);

    if (resourceKey === "workspace") {
      const workspaceMatch = pathname.match(new RegExp(`/groups/(${guidPattern})(?:/|$)`, "i"));
      return workspaceMatch?.[1];
    }

    const matches = pathname.match(new RegExp(guidPattern, "g"));
    return matches?.at(-1);
  } catch {
    const match = trimmed.match(new RegExp(guidPattern, "i"));
    return match?.[0];
  }
}
