# Datapass Fabric Toolbox

A thin **Microsoft Fabric companion for VS Code**.

This repository intentionally does **not** fork Microsoft Fabric for VS Code, FabricStudio, or Microsoft Fabric Toolbox. Instead it composes them:

- **Microsoft Fabric VS Code extension** — official authentication, workspace navigation, item creation/import/export and the Fabric developer shell.
- **FabricStudio (Gerhard Brueckl)** — optional mature UI for workspaces, definitions, deployment pipelines, connections, capacities, administration, API notebooks and related power-user workflows.
- **Microsoft Fabric Toolbox** — upstream catalog of accelerators, monitoring assets, migration tools, scripts and MCP servers.
- **Datapass Fabric Toolbox** — the missing orchestration layer: project checklist, machine-readable project state, AI handoff and light UI around useful CLI/script-only tools.

## Current integration mode

Datapass declares the official Microsoft Fabric extension as an extension dependency.

For private/unpublished builds, Datapass currently integrates through the **commands and views contributed by the Microsoft extension**, with a Fabric portal fallback. The current Microsoft core implementation validates satellite registrations against an allow-list before accepting `addExtension()`.

That means we do **not** spoof an approved satellite identity and we do **not** fork the core extension. If Datapass is allow-listed later, the direct service-collection integration can be added behind the same adapter.

## V0.3

The extension now provides:

- a **Datapass Fabric** Activity Bar entry;
- a native VS Code **Project Checklist** grouped by project phase;
- project-level progress percentage and a computed **Next** action;
- task actions for **open/start**, **in progress**, **done**, **blocked**, and **todo**;
- upstream Fabric command handoff with portal fallback;
- persisted **`fabric.project.json`** project state with JSON schema validation;
- a first **Foil'o real-time wind telemetry** project template;
- automatic **`FABRIC_HANDOFF.md`** export for ChatGPT/Codex/Copilot;
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

You can override it with `datapassFabric.assessmentCommand`.

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
- known Fabric resource names/IDs;
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

1. Pass CI and consume the generated VSIX artifact.
2. Add resource capture (workspace/item IDs) back into `fabric.project.json`.
3. Add richer task-specific deep links and validation.
4. Expand monitoring/deployment tool adapters selectively.
5. Add a second project template (Contoso batch/medallion) after the Foil'o path is stable.
