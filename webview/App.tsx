import React, { useEffect, useMemo, useState } from "react";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

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
    id: "migration",
    name: "Data Factory Migration Assistant",
    description: "Existing React wizard for ADF/Synapse to Fabric migration. We link to it instead of rebuilding it.",
    ui: "Existing UI",
    action: "Open assistant",
    target: "migration"
  },
  {
    id: "assessment",
    name: "Fabric Assessment Tool",
    description: "Migration inventory and readiness assessment. Currently CLI-first; a Datapass wrapper is a good candidate.",
    ui: "CLI / Script",
    action: "Open source",
    target: "assessment"
  },
  {
    id: "security",
    name: "Fabric Security Audit",
    description: "PowerShell security troubleshooter with Markdown/JSON/CSV outputs. Candidate for a guided Datapass form.",
    ui: "CLI / Script",
    action: "Open source",
    target: "security"
  },
  {
    id: "mcp",
    name: "MCP",
    description: "Optional agent integration. Keep it discoverable and status-oriented; do not make the Fabric workflow depend on it.",
    ui: "Datapass UI",
    action: "Open Toolbox",
    target: "toolbox"
  }
];

export function App(): React.JSX.Element {
  const [environment, setEnvironment] = useState({
    coreInstalled: false,
    studioInstalled: false
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "environment") {
        setEnvironment({
          coreInstalled: Boolean(event.data.coreInstalled),
          studioInstalled: Boolean(event.data.studioInstalled)
        });
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const coreStatus = useMemo(
    () => environment.coreInstalled ? "Installed" : "Not detected",
    [environment.coreInstalled]
  );

  return (
    <main>
      <header>
        <p className="eyebrow">DATAPASS FABRIC</p>
        <h1>Toolbox</h1>
        <p className="muted">
          One place to discover Fabric utilities without duplicating good existing UIs.
        </p>
      </header>

      <section className="statusGrid">
        <StatusCard name="Microsoft Fabric" value={coreStatus} />
        <StatusCard
          name="FabricStudio"
          value={environment.studioInstalled ? "Installed" : "Optional"}
        />
      </section>

      <section className="actions">
        <button onClick={() => vscode.postMessage({ type: "command", command: "initialize" })}>
          Initialize Foil&apos;o checklist
        </button>
        <button className="secondary" onClick={() => open("fabric")}>
          Open Fabric
        </button>
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
        <strong>Rule:</strong> if Fabric or Toolbox already has a good UI, open it. Datapass adds UI only
        where a script/CLI is useful but awkward, and keeps project progress in <code>fabric.project.json</code>.
      </section>
    </main>
  );

  function open(target: string): void {
    vscode.postMessage({ type: "open", target });
  }
}

function StatusCard(props: { name: string; value: string }): React.JSX.Element {
  return (
    <div className="statusCard">
      <span>{props.name}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
