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

## V0.5

The extension now provides:

- a **Datapass Fabric** Activity Bar entry;
- a native VS Code **Project Checklist** grouped by project phase;
- project-level progress percentage and a computed **Next** action;
- task actions for **open/start**, **in progress**, **done**, **blocked**, and **todo**;
- explicit task-to-resource links for workspace, Eventstream, Eventhouse, Lakehouse, medallion notebooks, semantic model, report and deployment pipeline;
- consistency validation that flags a completed task when its linked Fabric resource is not recorded;
- one-click capture/update of the Fabric resource linked to a checklist task;
- prompts to keep task state and resource state synchronized;
- upstream Fabric command handoff with portal fallback;
- persisted **`fabric.project.json`** project state with JSON schema validation;
- manual **Fabric resource capture** (workspace, Eventstream, Eventhouse, Lakehouse, notebooks, semantic model, report, deployment pipeline);
- GUID extraction from pasted Fabric item URLs;
- a first **Foil'o real-time wind telemetry** project template;
- automatic **`FABRIC_HANDOFF.md`** export for ChatGPT/Codex/Copilot, including validation findings;
- a React **Toolbox** webview with current-project status;
- Microsoft Fabric and FabricStudio detection;
- guided **Fabric Security Audit** UI that runs the existing local Toolbox PowerShell script;
- guided **Fabric Assessment Tool** command UI for Synapse/Databricks assessment;
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

## MCP

MCP is optional. Datapass can open/create a workspace `.vscode/mcp.json` with an empty `servers` object and reports whether workspace or portable `.mcp.json` configuration exists. It does not auto-install or trust any MCP server.

## Project state

`fabric.project.json` is authoritative. It is deliberately portable and readable by humans and AI tools.

The extension can export `FABRIC_HANDOFF.md`, summarizing:

- architecture;
- progress percentage;
- next action;
- completed work;
- in-progress work;
- remaining checklist tasks;
- known Fabric resource names/IDs/URLs;
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

1. Install the CI-generated VSIX in VS Code and verify the interaction flow against a real Fabric tenant.
2. Add richer task-specific deep links and validation for Eventstream/Eventhouse/Lakehouse.
3. Expand monitoring/deployment tool adapters selectively.
4. Add project template selection and then a Contoso batch/medallion template.
5. Revisit direct Fabric satellite registration only if Microsoft exposes a supported path for this extension ID.
