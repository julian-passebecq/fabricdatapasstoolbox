import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  sourcemap: true,
  logLevel: "info"
};

const extensionOptions = {
  ...common,
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode"]
};

const webviewOptions = {
  ...common,
  entryPoints: ["webview/index.tsx"],
  outfile: "dist/webview.js",
  platform: "browser",
  format: "iife",
  loader: { ".css": "css" }
};

if (watch) {
  const extension = await esbuild.context(extensionOptions);
  const webview = await esbuild.context(webviewOptions);
  await Promise.all([extension.watch(), webview.watch()]);
} else {
  await Promise.all([
    esbuild.build(extensionOptions),
    esbuild.build(webviewOptions)
  ]);
}
