# Datapass Fabric Toolbox

A thin **Microsoft Fabric companion for VS Code**.

This repository intentionally does **not** fork Microsoft Fabric for VS Code, FabricStudio, or Microsoft Fabric Toolbox. Instead it composes them:

- **Microsoft Fabric VS Code extension** — official authentication, workspace navigation, generic item import/export and the supported satellite-extension seam.
- **FabricStudio (Gerhard Brueckl)** — optional mature UI for workspaces, definitions, deployment pipelines, connections, capacities, administration, API notebooks and related power-user workflows.
- **Microsoft Fabric Toolbox** — upstream catalog of accelerators, monitoring assets, migration tools, scripts and MCP servers.
- **Datapass Fabric Toolbox** — the missing orchestration layer: project checklist, machine-readable project state, AI handoff and light UI around useful CLI/script-only tools.

## V0.1

The first implementation provides:

- a **Datapass Fabric** Activity Bar entry;
- a native VS Code **Project Checklist**;
- a persisted **`fabric.project.json`** project state;
- a first **Foil'o real-time wind telemetry** project template;
- automatic **`FABRIC_HANDOFF.md`** export for ChatGPT/Codex/Copilot;
- a React **Toolbox** webview;
- detection of the Microsoft Fabric and FabricStudio extensions;
- links to existing migration/UI tools instead of reimplementing them.

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

## Project state

`fabric.project.json` is authoritative. It is deliberately portable and readable by humans and AI tools.

The extension can export `FABRIC_HANDOFF.md`, summarizing:

- architecture;
- completed work;
- in-progress work;
- remaining checklist tasks;
- architectural decisions.

## What we do not duplicate

| Capability | Owner |
| --- | --- |
| Fabric authentication / workspace navigation | Microsoft Fabric extension |
| Fabric item power-user/admin UI | FabricStudio |
| ADF migration wizard | Fabric Toolbox migration assistant |
| Project plan / checklist / state | Datapass |
| Guided UI for CLI/script-only Toolbox utilities | Datapass (incrementally) |
| Fabric REST implementation | Upstream extensions / APIs, not a Datapass clone |

## Related repositories

- `julian-passebecq/fabric-toolbox_J` — your fork/reference copy of Microsoft Fabric Toolbox. Keep as a source catalog; do not merge it wholesale here.
- `julian-passebecq/fastapi-fabric` — independent Fabric Factory simulator backend. Keep separate and optional.
- `julian-passebecq/Contoso_Data_Fabric` — Contoso data generator/lab assets; useful as a future project template, not as this extension's base.

## Next gates

1. Validate/build the extension and install it locally as VSIX.
2. Add richer checklist actions that deep-link to the correct Fabric/FabricStudio operation.
3. Add guided React wrappers for **Security Audit** and **Fabric Assessment Tool**.
4. Add optional MCP setup/status without making MCP a hard dependency.
5. Add a second project template (Contoso batch/medallion) after the Foil'o path is stable.
