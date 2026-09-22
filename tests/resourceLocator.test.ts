import assert from "node:assert/strict";
import test from "node:test";
import { extractFabricId } from "../src/resourceLocator";

const WORKSPACE = "11111111-2222-3333-4444-555555555555";
const ITEM = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

test("returns a bare Fabric GUID unchanged", () => {
  assert.equal(extractFabricId("lakehouse", ITEM), ITEM);
});

test("extracts workspace id from Fabric workspace URL", () => {
  const url = `https://app.fabric.microsoft.com/groups/${WORKSPACE}/list`;
  assert.equal(extractFabricId("workspace", url), WORKSPACE);
});

test("extracts the final item GUID from a Fabric item URL", () => {
  const url = `https://app.fabric.microsoft.com/groups/${WORKSPACE}/lakehouses/${ITEM}?experience=data-engineering`;
  assert.equal(extractFabricId("lakehouse", url), ITEM);
});

test("workspace capture does not accidentally return an item id", () => {
  const url = `https://app.fabric.microsoft.com/groups/${WORKSPACE}/lakehouses/${ITEM}`;
  assert.equal(extractFabricId("workspace", url), WORKSPACE);
});

test("extracts a GUID embedded in pasted text", () => {
  assert.equal(
    extractFabricId("eventstream", `Eventstream id: ${ITEM}`),
    ITEM
  );
});

test("returns undefined when no Fabric GUID can be found", () => {
  assert.equal(extractFabricId("report", "not-a-fabric-id"), undefined);
});
