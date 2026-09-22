import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_TOOLBOX_ITEMS,
  findToolUrl,
  PRIMARY_TOOLS
} from "../src/toolboxCatalog";

test("Toolbox catalog has unique ids and trusted upstream links", () => {
  const items = [...PRIMARY_TOOLS, ...CURATED_TOOLBOX_ITEMS];
  const ids = items.map(item => item.id);

  assert.equal(new Set(ids).size, ids.length);

  for (const item of CURATED_TOOLBOX_ITEMS) {
    assert.match(item.url, /^https:\/\/github\.com\/microsoft\/fabric-toolbox\/tree\/main\//);
    assert.equal(findToolUrl(item.id), item.url);
  }
});

test("Toolbox catalog exposes optional MCP and RTI assets", () => {
  assert.ok(CURATED_TOOLBOX_ITEMS.some(item =>
    item.id === "fabricMgmtMcp" && item.surface === "MCP server"
  ));
  assert.ok(CURATED_TOOLBOX_ITEMS.some(item =>
    item.id === "semanticMcp" && item.surface === "MCP server"
  ));
  assert.ok(CURATED_TOOLBOX_ITEMS.some(item =>
    item.id === "rtiEventstream" && item.category === "Real-time"
  ));
  assert.ok(CURATED_TOOLBOX_ITEMS.some(item =>
    item.id === "rtiEventhouse" && item.category === "Real-time"
  ));
});
