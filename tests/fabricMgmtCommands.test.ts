import assert from "node:assert/strict";
import test from "node:test";
import { buildFabricMgmtCommand } from "../src/fabricMgmtCommands";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

test("MicrosoftFabricMgmt builder emits explicit safe commands", () => {
  assert.equal(
    buildFabricMgmtCommand("status"),
    "Get-Module -ListAvailable -Name MicrosoftFabricMgmt | Select-Object Name, Version, Path"
  );
  assert.equal(
    buildFabricMgmtCommand("install"),
    "Install-Module -Name MicrosoftFabricMgmt -Scope CurrentUser -Repository PSGallery"
  );
  assert.equal(
    buildFabricMgmtCommand("connect", { tenantId }),
    `Import-Module MicrosoftFabricMgmt; Connect-FabricAccount -TenantId '${tenantId}'`
  );
  assert.equal(
    buildFabricMgmtCommand("workspaces"),
    "Import-Module MicrosoftFabricMgmt; Get-FabricWorkspace"
  );
  assert.equal(
    buildFabricMgmtCommand("lakehouses", { workspaceId }),
    `Import-Module MicrosoftFabricMgmt; Get-FabricLakehouse -WorkspaceId '${workspaceId}'`
  );
  assert.equal(
    buildFabricMgmtCommand("warehouses", { workspaceId }),
    `Import-Module MicrosoftFabricMgmt; Get-FabricWarehouse -WorkspaceId '${workspaceId}'`
  );
  assert.equal(
    buildFabricMgmtCommand("pipelines", { workspaceId }),
    `Import-Module MicrosoftFabricMgmt; Get-FabricDataPipeline -WorkspaceId '${workspaceId}'`
  );
});

test("MicrosoftFabricMgmt builder rejects missing or malformed identifiers", () => {
  assert.throws(() => buildFabricMgmtCommand("connect"), /Tenant ID is required/);
  assert.throws(
    () => buildFabricMgmtCommand("connect", { tenantId: "not-a-guid" }),
    /Tenant ID must be a valid GUID/
  );
  assert.throws(
    () => buildFabricMgmtCommand("lakehouses", { workspaceId: "not-a-guid" }),
    /Workspace ID must be a valid GUID/
  );
});
