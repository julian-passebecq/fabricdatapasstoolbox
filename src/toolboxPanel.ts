import * as vscode from "vscode";

const URLS: Record<string, string> = {
  fabric: "https://app.fabric.microsoft.com/",
  migration: "https://github.com/microsoft/fabric-toolbox/tree/main/tools/FabricDataFactoryMigrationAssistant",
  assessment: "https://github.com/microsoft/fabric-toolbox/tree/main/tools/fabric-assessment-tool",
  security: "https://github.com/microsoft/fabric-toolbox/tree/main/tools/fabric-security-audit",
  toolbox: "https://github.com/microsoft/fabric-toolbox",
  fabricStudio: "https://marketplace.visualstudio.com/items?itemName=GerhardBrueckl.fabricstudio"
};

export class ToolboxViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "datapassFabric.toolbox";

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist")]
    };

    const script = view.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "dist", "webview.js"));
    const style = view.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "dist", "webview.css"));
    const nonce = String(Date.now());

    view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${view.webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${style}" rel="stylesheet">
  <title>Datapass Fabric Toolbox</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;

    view.webview.onDidReceiveMessage(async message => {
      if (message?.type === "open" && typeof message.target === "string") {
        const url = URLS[message.target];
        if (url) {
          await vscode.env.openExternal(vscode.Uri.parse(url));
        }
      }

      if (message?.type === "command" && message.command === "initialize") {
        await vscode.commands.executeCommand("datapassFabric.initializeProject");
      }
    });

    const coreInstalled = Boolean(vscode.extensions.getExtension("fabric.vscode-fabric"));
    const studioInstalled = Boolean(vscode.extensions.getExtension("GerhardBrueckl.fabricstudio"));
    view.webview.postMessage({
      type: "environment",
      coreInstalled,
      studioInstalled
    });
  }
}
