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

type ProjectSummary = {
  name: string;
  type: string;
  environment: string;
  done: number;
  total: number;
  percent: number;
  nextTitle?: string;
};

type ExtensionState = {
  environment: Environment;
  project?: ProjectSummary;
};

type Tool = {
  id: string;
  name: string;
  description: string;
  ui: "Existing UI" | "Datapass UI" | "CLI / Script";
  action: string;
  target: string;
};

const tools: Tool[] = [
  {
    id: "fabricStudio",
    name: "FabricStudio",
    description: "Mature VS Code UI for Fabric workspace power-user, deployment, connection, capacity and admin workflows.",
    ui: "Existing UI",
    action: "Open FabricStudio",
    target: "fabricStudio"
  },
  {
    id: "migration",
    name: "Data Factory Migration Assistant",
    description: "Existing React wizard for ADF/Synapse to Fabric migration. Datapass links to it instead of rebuilding it.",
    ui: "Existing UI",
    action: "Open assistant",
    target: "migration"
  },
  {
    id: "assessment",
    name: "Fabric Assessment Tool",
    description: "Migration inventory and readiness assessment. Currently CLI-first; a guided Datapass wrapper is a good candidate.",
    ui: "CLI / Script",
    action: "Open source",
    target: "assessment"
  },
  {
    id: "security",
    name: "Fabric Security Audit",
    description: "PowerShell security troubleshooter with Markdown/JSON/CSV outputs. This is the first strong candidate for a guided Datapass form.",
    ui: "CLI / Script",
    action: "Open source",
    target: "security"
  },
  {
    id: "mcp",
    name: "MCP",
    description: "Optional agent integration. Keep it discoverable and status-oriented; the Fabric workflow must not depend on it.",
    ui: "Datapass UI",
    action: "Open Toolbox",
    target: "toolbox"
  }
];

export function App(): React.JSX.Element {
  const [state, setState] = useState<ExtensionState>({
    environment: {
      coreInstalled: false,
      coreActive: false,
      studioInstalled: false,
      studioActive: false,
      bridgeMode: "portal"
    }
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "state") {
        setState({
          environment: event.data.environment,
          project: event.data.project
        });
      }
    };

    window.addEventListener("message", listener);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", listener);
  }, []);

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
          <p className="next">
            <strong>Next:</strong> {state.project.nextTitle ?? "Checklist complete"}
          </p>
          <div className="buttonRow">
            <button onClick={() => command("checklist")}>Open checklist</button>
            <button className="secondary" onClick={() => command("handoff")}>AI handoff</button>
          </div>
        </section>
      ) : (
        <section className="emptyProject">
          <strong>No project manifest detected.</strong>
          <p>Create the Foil&apos;o starter checklist in the currently opened folder.</p>
          <button onClick={() => command("initialize")}>Initialize Foil&apos;o project</button>
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
          {tools.map(tool => (
            <article className="toolCard" key={tool.id}>
              <div className="toolHeader">
                <h3>{tool.name}</h3>
                <span className="badge">{tool.ui}</span>
              </div>
              <p>{tool.description}</p>
              <button className="linkButton" onClick={() => open(tool.target)}>
                {tool.action}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="principle">
        <strong>Integration rule:</strong> private Datapass builds currently use Microsoft Fabric&apos;s contributed
        VS Code commands and views. Microsoft&apos;s core currently allow-lists satellite IDs for direct
        <code> addExtension()</code> registration, so Datapass does not hard-depend on that path yet.
      </section>
    </main>
  );

  function open(target: string): void {
    vscode.postMessage({ type: "open", target });
  }

  function command(commandName: string): void {
    vscode.postMessage({ type: "command", command: commandName });
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
