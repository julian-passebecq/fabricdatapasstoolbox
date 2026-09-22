export type FabricMgmtOperation =
  | "status"
  | "install"
  | "connect"
  | "workspaces"
  | "lakehouses"
  | "warehouses"
  | "pipelines";

export interface FabricMgmtCommandInput {
  tenantId?: string;
  workspaceId?: string;
}

export function buildFabricMgmtCommand(
  operation: FabricMgmtOperation,
  input: FabricMgmtCommandInput = {}
): string {
  switch (operation) {
    case "status":
      return "Get-Module -ListAvailable -Name MicrosoftFabricMgmt | Select-Object Name, Version, Path";

    case "install":
      return "Install-Module -Name MicrosoftFabricMgmt -Scope CurrentUser -Repository PSGallery";

    case "connect": {
      const tenantId = requireGuid(input.tenantId, "Tenant ID");
      return `Import-Module MicrosoftFabricMgmt; Connect-FabricAccount -TenantId ${psQuote(tenantId)}`;
    }

    case "workspaces":
      return "Import-Module MicrosoftFabricMgmt; Get-FabricWorkspace";

    case "lakehouses": {
      const workspaceId = requireGuid(input.workspaceId, "Workspace ID");
      return `Import-Module MicrosoftFabricMgmt; Get-FabricLakehouse -WorkspaceId ${psQuote(workspaceId)}`;
    }

    case "warehouses": {
      const workspaceId = requireGuid(input.workspaceId, "Workspace ID");
      return `Import-Module MicrosoftFabricMgmt; Get-FabricWarehouse -WorkspaceId ${psQuote(workspaceId)}`;
    }

    case "pipelines": {
      const workspaceId = requireGuid(input.workspaceId, "Workspace ID");
      return `Import-Module MicrosoftFabricMgmt; Get-FabricDataPipeline -WorkspaceId ${psQuote(workspaceId)}`;
    }

    default:
      return assertNever(operation);
  }
}

function requireGuid(value: string | undefined, label: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    throw new Error(`${label} must be a valid GUID.`);
  }

  return trimmed;
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported MicrosoftFabricMgmt operation: ${String(value)}`);
}
