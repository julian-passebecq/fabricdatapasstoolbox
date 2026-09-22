import * as vscode from "vscode";
import { extractFabricId } from "./resourceLocator";

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

export async function captureResource(expectedKey?: string): Promise<CapturedResource | undefined> {
  let choice: ResourceChoice | undefined;

  if (expectedKey) {
    choice = resourceChoices.find(item => item.key === expectedKey);
    if (!choice) {
      throw new Error(`Unknown Fabric resource type: ${expectedKey}`);
    }
  } else {
    choice = await vscode.window.showQuickPick(resourceChoices, {
      title: "Record Fabric resource",
      placeHolder: "Choose the resource type to store in fabric.project.json"
    });
  }

  if (!choice) {
    return undefined;
  }

  const displayLabel = choice.label.replace(/^\$\([^)]*\)\s*/, "");
  const name = await vscode.window.showInputBox({
    title: `Record ${displayLabel}`,
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

