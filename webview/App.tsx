import React, { useEffect, useState } from "react";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

type Environment = {
  coreInstalled: boolean;
  coreActive: boolean;
  studioInstalled: boolean;
  studioActive: boolean;
  bridgeMode: "commands" | "portal";
};

type Runtime = {
  toolboxRoot?: string;
  securityAuditReady: boolean;
  securityAuditPath?: string;
  assessmentCommand: string;
  workspaceMcpConfigured: boolean;
  portableMcpConfigured: boolean;
};

type ProjectSummary = {
  name: string;
  type: string;
  environment: string;
  templateId?: string;
  templateName?: string;
  templateVersion?: number;
  templateCurrentVersion?: number;
  templateOutdated: boolean;
  done: number;
  total: number;
  percent: number;
  nextTitle?: string;
  nextTaskId?: string;
  resourceCount: number;
  issueCount: number;
  readyTitles: string[];
  recentActivity: Array<{
    title: string;
    status: string;
    at?: string;
  }>;
  architectureStages: Array<{
    label: string;
    items: string[];
  }>;
};

type ManifestStatus = {
  exists: boolean;
  errors: string[];
};

type ExtensionState = {
  environment: Environment;
  runtime: Runtime;
  tools: Tool[];
  catalogItems: CatalogItem[];
  manifestStatus: ManifestStatus;
  project?: ProjectSummary;
};

type Tool = {
  id: string;
  name: string;
  description: string;
  ui: "Existing UI" | "Datapass UI" | "CLI / Script";
};

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  surface: string;
};

const emptyState: ExtensionState = {
  environment: {
    coreInstalled: false,
    coreActive: false,
    studioInstalled: false,
    studioActive: false,
    bridgeMode: "portal"
  },
  runtime: {
    securityAuditReady: false,
    assessmentCommand: "fat",
    workspaceMcpConfigured: false,
    portableMcpConfigured: false
  },
  tools: [],
  catalogItems: [],
  manifestStatus: {
    exists: false,
    errors: []
  }
};

export function App(): React.JSX.Element {
  const [state, setState] = useState<ExtensionState>(emptyState);
  const [activeTool, setActiveTool] = useState<"security" | "assessment" | null>(null);
  const [securityUrl, setSecurityUrl] = useState("");
  const [securityUser, setSecurityUser] = useState("");
  const [assessmentSource, setAssessmentSource] = useState<"synapse" | "databricks">("synapse");
  const [assessmentWorkspace, setAssessmentWorkspace] = useState("");
  const [assessmentOutput, setAssessmentOutput] = useState("./fabric-assessment-output");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "state") {
        setState({
          environment: event.data.environment,
          runtime: event.data.runtime,
          tools: Array.isArray(event.data.tools) ? event.data.tools : [],
          catalogItems: Array.isArray(event.data.catalogItems) ? event.data.catalogItems : [],
          manifestStatus: event.data.manifestStatus ?? { exists: false, errors: [] },
          project: event.data.project
        });
      } else if (event.data?.type === "toolResult") {
        setResult(String(event.data.command ?? ""));
      } else if (event.data?.type === "toolError") {
        setResult(`Error: ${String(event.data.message ?? "Unknown error")}`);
      }
    };

    window.addEventListener("message", listener);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", listener);
  }, []);

  const normalizedCatalogQuery = catalogQuery.trim().toLowerCase();
  const filteredCatalog = state.catalogItems.filter(item => {
    if (!normalizedCatalogQuery) {
      return true;
    }
    return [item.name, item.category, item.surface]
      .some(value => value.toLowerCase().includes(normalizedCatalogQuery));
  });

  return (
    <main>
      <header>
        <p className="eyebrow">DATAPASS FABRIC</p>
        <h1>Toolbox</h1>
        <p className="muted">
          Project guidance plus useful Fabric utilities, without duplicating good upstream UIs.
        </p>
      </header>

      {state.project ? (
        <section className="projectCard">
          <div className="projectHeader">
            <div>
              <span className="smallLabel">CURRENT PROJECT</span>
              <h2>{state.project.name}</h2>
            </div>
            <strong>{state.project.percent}%</strong>
          </div>
          <progress
            className="progressTrack"
            max={100}
            value={state.project.percent}
            aria-label="Project progress"
          />
          <p className="projectMeta">
            {state.project.done}/{state.project.total} complete · {state.project.type} · {state.project.environment}
          </p>
          <div className="templateRow">
            <p className="templateMeta">
              <strong>Template:</strong>{" "}
              {state.project.templateName ?? state.project.templateId ?? "Custom"}
              {state.project.templateVersion ? ` · v${state.project.templateVersion}` : ""}
              {state.project.templateOutdated && state.project.templateCurrentVersion
                ? ` · update available: v${state.project.templateCurrentVersion}`
                : ""}
            </p>
            <button
              className="secondary templateCheck"
              onClick={() => command("templateStatus")}
            >
              Check
            </button>
          </div>
          <div className="projectHealth">
            <span>{state.project.resourceCount} resources recorded</span>
            <span className={state.project.issueCount ? "healthIssue" : "healthOk"}>
              {state.project.issueCount
                ? `${state.project.issueCount} validation issue${state.project.issueCount === 1 ? "" : "s"}`
                : "State consistent"}
            </span>
          </div>
          <p className="next">
            <strong>Next:</strong> {state.project.nextTitle ?? "Checklist complete"}
          </p>
          {state.project.readyTitles.length > 0 && (
            <p className="readyNow">
              <strong>Ready now:</strong> {state.project.readyTitles.join(" · ")}
            </p>
          )}
          {state.project.recentActivity.length > 0 && (
            <div className="recentActivity">
              <span className="smallLabel">RECENT ACTIVITY</span>
              {state.project.recentActivity.map(item => (
                <div className="activityRow" key={`${item.title}-${item.at}`}>
                  <span>{item.title}</span>
                  <small>{item.status.replace("_", " ")} · {item.at}</small>
                </div>
              ))}
            </div>
          )}
          <div className="architecture">
            <span className="smallLabel">ARCHITECTURE</span>
            <div className="architectureFlow">
              {state.project.architectureStages.map((stage, index) => (
                <React.Fragment key={stage.label}>
                  <div className="architectureStage">
                    <strong>{stage.label}</strong>
                    <div className="architectureItems">
                      {stage.items.map(item => <span key={item}>{item}</span>)}
                    </div>
                  </div>
                  {index < state.project!.architectureStages.length - 1 && (
                    <span className="architectureArrow" aria-hidden="true">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="buttonRow">
            <button
              disabled={!state.project.nextTaskId}
              onClick={() => command("next")}
            >
              {state.project.nextTaskId ? "Start next step" : "Checklist complete"}
            </button>
            <button className="secondary" onClick={() => command("validate")}>Validate state</button>
          </div>
          <div className="buttonRow compactRow">
            <button className="secondary" onClick={() => command("checklist")}>Open checklist</button>
            <button className="secondary" onClick={() => command("handoff")}>AI handoff</button>
          </div>
        </section>
      ) : state.manifestStatus.exists && state.manifestStatus.errors.length > 0 ? (
        <section className="emptyProject manifestInvalid">
          <strong>Project manifest is invalid.</strong>
          <p>Datapass will not overwrite it. Fix the manifest before continuing.</p>
          <ul className="manifestErrorList">
            {state.manifestStatus.errors.slice(0, 5).map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <button onClick={() => command("openManifest")}>Open fabric.project.json</button>
        </section>
      ) : (
        <section className="emptyProject">
          <strong>No project manifest detected.</strong>
          <p>Choose a guided Fabric architecture for the currently opened folder.</p>
          <button onClick={() => command("initialize")}>Choose project template</button>
        </section>
      )}

      <section className="statusGrid">
        <StatusCard
          name="Microsoft Fabric"
          value={state.environment.coreInstalled ? "Installed" : "Not detected"}
          detail={state.environment.bridgeMode === "commands" ? "VS Code command bridge" : "Portal fallback"}
        />
        <StatusCard
          name="FabricStudio"
          value={state.environment.studioInstalled ? "Installed" : "Optional"}
          detail={state.environment.studioActive ? "Active" : "Power-user UI"}
        />
      </section>

      <section className="actions">
        <button onClick={() => open("fabric")}>Open Fabric</button>
      </section>

      <section>
        <h2>Useful tools</h2>
        <div className="toolList">
          {state.tools.map(tool => (
            <article className="toolCard" key={tool.id}>
              <div className="toolHeader">
                <h3>{tool.name}</h3>
                <span className="badge">{tool.ui}</span>
              </div>
              <p>{tool.description}</p>
              {renderToolAction(tool)}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Curated Fabric Toolbox catalog</h2>
        <p className="muted catalogIntro">
          Useful upstream assets that already exist. Datapass links to them rather than copying their implementation.
        </p>
        <input
          className="catalogSearch"
          value={catalogQuery}
          onChange={event => setCatalogQuery(event.target.value)}
          placeholder="Filter monitoring, migration, BI, MCP..."
          aria-label="Filter Fabric Toolbox catalog"
        />
        <div className="catalogList">
          {filteredCatalog.map(item => (
            <div className="catalogRow" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <div className="catalogMeta">{item.category} · {item.surface}</div>
              </div>
              <button className="secondary catalogAction" onClick={() => open(item.id)}>Open</button>
            </div>
          ))}
        </div>
      </section>

      {activeTool === "security" && (
        <section className="guidedPanel">
          <div className="toolHeader">
            <h2>Security Audit</h2>
            <button className="iconButton" onClick={() => setActiveTool(null)}>Close</button>
          </div>

          <p className="muted">
            Runs the upstream <code>Invoke-FabricSecurityAudit.ps1</code> script from your local Fabric Toolbox clone.
          </p>

          <RuntimeNotice
            ready={state.runtime.securityAuditReady}
            readyText={state.runtime.securityAuditPath ?? "Security audit script detected"}
            missingText="Configure the local Fabric Toolbox folder before running this tool."
            onConfigure={() => command("configureToolboxRoot")}
          />

          <label>
            Fabric / Power BI item URL
            <input
              value={securityUrl}
              onChange={event => setSecurityUrl(event.target.value)}
              placeholder="https://app.fabric.microsoft.com/groups/.../warehouses/..."
            />
          </label>

          <label>
            User (optional)
            <input
              value={securityUser}
              onChange={event => setSecurityUser(event.target.value)}
              placeholder="user@contoso.com"
            />
          </label>

          <div className="buttonRow">
            <button
              disabled={!state.runtime.securityAuditReady}
              onClick={() => security("copy")}
            >
              Copy command
            </button>
            <button
              disabled={!state.runtime.securityAuditReady}
              onClick={() => security("run")}
            >
              Run in PowerShell
            </button>
          </div>

          <button className="linkButton" onClick={() => open("security")}>Open upstream source</button>
        </section>
      )}

      {activeTool === "assessment" && (
        <section className="guidedPanel">
          <div className="toolHeader">
            <h2>Fabric Assessment Tool</h2>
            <button className="iconButton" onClick={() => setActiveTool(null)}>Close</button>
          </div>

          <p className="muted">
            Uses the configured <code>{state.runtime.assessmentCommand}</code> command. Authentication remains with the upstream CLI.
          </p>

          <label>
            Source
            <select
              value={assessmentSource}
              onChange={event => setAssessmentSource(event.target.value as "synapse" | "databricks")}
            >
              <option value="synapse">Azure Synapse</option>
              <option value="databricks">Databricks</option>
            </select>
          </label>

          <label>
            Workspace (optional)
            <input
              value={assessmentWorkspace}
              onChange={event => setAssessmentWorkspace(event.target.value)}
              placeholder="workspace-name"
            />
          </label>

          <label>
            Output folder
            <input
              value={assessmentOutput}
              onChange={event => setAssessmentOutput(event.target.value)}
            />
          </label>

          <div className="buttonRow">
            <button onClick={() => assessment("copy")}>Copy command</button>
            <button onClick={() => assessment("run")}>Run in PowerShell</button>
          </div>

          <button className="linkButton" onClick={() => open("assessment")}>Open upstream source</button>
        </section>
      )}

      {result && (
        <section className="resultPanel">
          <span className="smallLabel">LAST GENERATED COMMAND</span>
          <code>{result}</code>
          <button className="linkButton" onClick={() => setResult("")}>Clear</button>
        </section>
      )}

      <section className="mcpPanel">
        <div>
          <h2>MCP</h2>
          <p className="muted">
            Workspace: {state.runtime.workspaceMcpConfigured ? "configured" : "not configured"} · Portable: {state.runtime.portableMcpConfigured ? "configured" : "not configured"}
          </p>
        </div>
        <button className="secondary" onClick={() => command("mcpConfig")}>Open MCP config</button>
      </section>

      <section className="principle">
        <strong>Integration rule:</strong> private Datapass builds currently use Microsoft Fabric&apos;s contributed
        VS Code commands and views. Microsoft&apos;s core currently allow-lists satellite IDs for direct
        <code> addExtension()</code> registration, so Datapass does not hard-depend on that path yet.
      </section>
    </main>
  );

  function renderToolAction(tool: Tool): React.JSX.Element {
    if (tool.id === "security") {
      return <button className="linkButton" onClick={() => setActiveTool("security")}>Open guided UI</button>;
    }
    if (tool.id === "assessment") {
      return <button className="linkButton" onClick={() => setActiveTool("assessment")}>Open guided UI</button>;
    }
    if (tool.id === "mcp") {
      return <button className="linkButton" onClick={() => command("mcpConfig")}>Open MCP config</button>;
    }

    return (
      <button className="linkButton" onClick={() => open(tool.id)}>
        {tool.id === "migration" ? "Open assistant" : "Open FabricStudio"}
      </button>
    );
  }

  function open(target: string): void {
    vscode.postMessage({ type: "open", target });
  }

  function command(commandName: string): void {
    vscode.postMessage({ type: "command", command: commandName });
  }

  function security(action: "copy" | "run"): void {
    setResult("");
    vscode.postMessage({
      type: "securityAudit",
      action,
      url: securityUrl,
      user: securityUser
    });
  }

  function assessment(action: "copy" | "run"): void {
    setResult("");
    vscode.postMessage({
      type: "assessment",
      action,
      source: assessmentSource,
      workspace: assessmentWorkspace,
      output: assessmentOutput
    });
  }
}

function StatusCard(props: { name: string; value: string; detail: string }): React.JSX.Element {
  return (
    <div className="statusCard">
      <span>{props.name}</span>
      <strong>{props.value}</strong>
      <small>{props.detail}</small>
    </div>
  );
}

function RuntimeNotice(props: {
  ready: boolean;
  readyText: string;
  missingText: string;
  onConfigure: () => void;
}): React.JSX.Element {
  if (props.ready) {
    return <p className="runtimeReady">{props.readyText}</p>;
  }

  return (
    <div className="runtimeMissing">
      <p>{props.missingText}</p>
      <button className="secondary" onClick={props.onConfigure}>Configure Toolbox folder</button>
    </div>
  );
}
