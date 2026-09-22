# Datapass Fabric Toolbox

A thin **Microsoft Fabric companion for VS Code**.

This repository intentionally does **not** fork Microsoft Fabric for VS Code, FabricStudio, or Microsoft Fabric Toolbox. Instead it composes them:

- **Microsoft Fabric VS Code extension** — official authentication, workspace navigation, item creation/import/export and the Fabric developer shell.
- **FabricStudio (Gerhard Brueckl)** — optional mature UI for workspaces, definitions, deployment pipelines, connections, capacities, administration, API notebooks and related power-user workflows.
- **Microsoft Fabric Toolbox** — upstream catalog of accelerators, monitoring assets, migration tools, scripts and MCP servers.
- **Datapass Fabric Toolbox** — the missing orchestration layer: project checklist, machine-readable project state, resource inventory, AI handoff and light UI around useful CLI/script-only tools.

## Current integration mode

Datapass declares the official Microsoft Fabric extension as an extension dependency.

For private/unpublished builds, Datapass currently integrates through the **commands and views contributed by the Microsoft extension**, with a Fabric portal fallback. The current Microsoft core implementation validates satellite registrations against an allow-list before accepting `addExtension()`.

That means we do **not** spoof an approved satellite identity and we do **not** fork the core extension. If Datapass is allow-listed later, the direct service-collection integration can be added behind the same adapter.

## V0.7

The extension now provides:

- a **Datapass Fabric** Activity Bar entry;
- project-template selection with **Foil\'o real-time** and **Contoso batch/Data Factory** starter architectures;
- template identity/version persisted in `fabric.project.json` for safe future evolution;
- a native VS Code **Project Checklist** grouped by project phase;
- project-level progress percentage, a dependency-aware **Next** action, and a **Ready now** set;
- task actions for **open/start**, **in progress**, **done**, **blocked**, and **todo**;
- explicit task dependencies so the Foil’o path teaches sequencing such as Eventstream → Bronze → Silver → Gold → semantic model → Power BI;
- explicit task-to-resource links for workspace, Eventstream, Eventhouse, Lakehouse, medallion notebooks, semantic model, report and deployment pipeline;
- consistency validation that flags missing linked resources, duplicate task IDs, unknown dependencies, dependency cycles and dependency/sequencing violations;
- runtime manifest validation that refuses to overwrite invalid `fabric.project.json` state;
- one-click capture/update of the Fabric resource linked to a checklist task;
- prompts to keep task state and resource state synchronized;
- upstream Fabric command handoff with portal fallback;
- persisted **`fabric.project.json`** project state with JSON schema validation;
- manual **Fabric resource capture** (workspace, Eventstream, Eventhouse, Lakehouse, notebooks, semantic model, report, deployment pipeline);
- GUID extraction from pasted Fabric item URLs;
- a first **Foil'o real-time wind telemetry** project template;
- automatic **`FABRIC_HANDOFF.md`** export for ChatGPT/Codex/Copilot, including validation findings;
- a React **Toolbox** webview with current-project status;
- a searchable, backend-driven catalog of verified Fabric Toolbox monitoring, migration, BI, RTI, development and MCP assets;
- Microsoft Fabric and FabricStudio detection;
- guided **Fabric Security Audit** UI that runs the existing local Toolbox PowerShell script;
- guided **Fabric Assessment Tool** command UI for Synapse/Databricks assessment;
- guided **MicrosoftFabricMgmt** PowerShell 7 UI with explicit module check/install, interactive tenant login, workspace listing and Lakehouse/Warehouse/Data Pipeline inspection;
- guided **Semantic Model Audit** setup flow for the upstream Fabric notebook + Power BI template;
- secure **Lineage Extractor** prerequisite guide that never asks Datapass for client secrets;
- task status audit timestamps and Fabric resource first-recorded/last-updated evidence in `fabric.project.json`;
- recent checklist activity in the React dashboard and AI handoff;
- optional MCP workspace status and `.vscode/mcp.json` creation;
- GitHub Actions typecheck/build/VSIX packaging.

### Foil'o starter architecture

```text
Oracle VM / Kafka
        |
        v
Fabric Eventstream
        |
        +------> Eventhouse / KQL
        |
        v
Lakehouse
Bronze -> Silver -> Gold
                    |
                    v
             Semantic Model
                    |
                    v
                Power BI
```

## Development

```bash
npm install
npm run check
npm run build
```

Run the extension with the VS Code Extension Development Host.

To create a local VSIX:

```bash
npm run package
```

Marketplace publication is not required for personal use; install the generated VSIX directly in VS Code.

## Resource inventory and task linkage

Use **Datapass Fabric: Record Fabric Resource** or the database icon on the checklist view.

You can paste either a GUID or a Fabric item URL. Datapass records the name, extracted ID, and original URL in `fabric.project.json`.

Foil'o tasks also declare the resource they expect. For example:

```json
{
  "id": "lakehouse",
  "title": "Create Lakehouse",
  "resourceKey": "lakehouse"
}
```

If a linked task is marked done without the resource being recorded, the checklist shows a warning and **Datapass Fabric: Validate Project State** reports the inconsistency. This makes the manifest more reliable as an AI handoff.

## Local Fabric Toolbox

The Security Audit wrapper deliberately does not copy Microsoft Fabric Toolbox scripts into this repository.

Configure a local clone through:

```text
Datapass Fabric: Configure Local Fabric Toolbox
```

or set:

```json
{
  "datapassFabric.toolboxRoot": "C:\\path\\to\\fabric-toolbox"
}
```

Datapass then invokes:

```text
tools/fabric-security-audit/Invoke-FabricSecurityAudit.ps1
```

inside that clone.

## Fabric Assessment Tool

Install the upstream tool as documented by Microsoft Fabric Toolbox. Datapass defaults to the CLI command:

```text
fat
```

You can override it with `datapassFabric.assessmentCommand`; executable paths with spaces are supported.

## MicrosoftFabricMgmt

The React Toolbox includes a guided PowerShell 7 front end for the upstream `MicrosoftFabricMgmt` module. It generates or explicitly runs:

- module status checks;
- `Install-Module -Name MicrosoftFabricMgmt -Scope CurrentUser`;
- interactive `Connect-FabricAccount -TenantId ...`;
- `Get-FabricWorkspace`;
- workspace-scoped Lakehouse, Warehouse and Data Pipeline listing.

Datapass does not collect or persist passwords, client secrets or service-principal credentials.

## Notebook-based guided tools

**Semantic Model Audit** is treated as a Fabric notebook + Power BI template workflow, not as a fake local CLI. The guide covers Workspace Monitoring, notebook import, Lakehouse attachment, model selection, scheduling and report-template connection.

**Lineage Extractor** is exposed as a prerequisite/setup guide. Datapass intentionally provides no client-secret fields; production credentials should remain outside notebooks/source control in an appropriate secret store.

## MCP

MCP is optional. Datapass can open/create a workspace `.vscode/mcp.json` with an empty `servers` object and reports whether workspace or portable `.mcp.json` configuration exists. It does not auto-install or trust any MCP server.

## Project state

`fabric.project.json` is authoritative. It is deliberately portable and readable by humans and AI tools.

The extension can export `FABRIC_HANDOFF.md`, summarizing:

- architecture;
- progress percentage;
- next action;
- tasks that are ready now;
- completed work;
- in-progress work;
- remaining checklist tasks;
- known Fabric resource names/IDs/URLs plus evidence timestamps;
- recent task status transitions;
- task/resource validation findings;
- architectural decisions.

## What we do not duplicate

| Capability | Owner |
| --- | --- |
| Fabric authentication / workspace navigation | Microsoft Fabric extension |
| Fabric item power-user/admin UI | FabricStudio |
| ADF migration wizard | Fabric Toolbox migration assistant |
| Project plan / checklist / state | Datapass |
| Guided UI for CLI/script-only Toolbox utilities | Datapass |
| Fabric REST implementation | Upstream extensions / APIs, not a Datapass clone |

## Related repositories

- `julian-passebecq/fabric-toolbox_J` — your fork/reference copy of Microsoft Fabric Toolbox. Keep as a source catalog; do not merge it wholesale here.
- `julian-passebecq/fastapi-fabric` — independent Fabric Factory simulator backend. Keep separate and optional.
- `julian-passebecq/Contoso_Data_Fabric` — Contoso data generator/lab assets; useful as a future project template, not as this extension's base.

## Next gates

1. Install the CI-generated VSIX in VS Code and exercise Foil'o + Contoso against a real Fabric tenant.
2. Add deeper task-specific navigation/validation for Eventstream, Eventhouse, Lakehouse, Data Pipeline and Warehouse resources.
3. Add read-only runtime status for selected monitoring/deployment assets where stable upstream interfaces exist.
4. Add safe, explicit project-template migrations only when a template version actually changes.
5. Revisit direct Fabric satellite registration only if Microsoft exposes a supported path for this extension ID.

## Project templates

### Foil'o Wind — Real-time Fabric

```text
Oracle VM / Kafka
        |
        v
Eventstream
   |        \
   v         v
Eventhouse  Lakehouse
               |
        Bronze -> Silver -> Gold
                          |
                     Semantic Model
                          |
                       Power BI
```

Use this path for Eventstream, Eventhouse/KQL, real-time telemetry and the wind-turbine simulator.

### Contoso — Batch Data Factory

```text
Contoso generator / files / SQL
              |
              v
       Fabric Data Pipeline
              |
              v
          Lakehouse
     Bronze -> Silver -> Gold
              |
              v
          Warehouse
              |
       Semantic Model
              |
           Power BI
```

Use this path for Data Factory/Pipeline, batch ingestion, Lakehouse + Warehouse, medallion transformations and BI.
