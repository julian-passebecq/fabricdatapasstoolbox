import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultFoilManifest,
  getProgress,
  getProjectIssues,
  renderHandoff
} from "../src/projectModel";

test("Foil'o template starts with the expected architecture and checklist", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  const progress = getProgress(manifest);

  assert.equal(manifest.project.name, "foil-wind");
  assert.deepEqual(manifest.architecture.source, ["oracle-vm", "kafka"]);
  assert.deepEqual(manifest.architecture.ingestion, ["eventstream"]);
  assert.deepEqual(manifest.architecture.storage, ["eventhouse", "lakehouse"]);
  assert.equal(manifest.tasks.length, 13);
  assert.equal(progress.done, 0);
  assert.equal(progress.total, 13);
  assert.equal(progress.percent, 0);
  assert.equal(progress.next?.id, "fabric-login");
});

test("progress prioritizes an in-progress task over later todo tasks", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  manifest.tasks[0].status = "done";
  manifest.tasks[1].status = "in_progress";

  const progress = getProgress(manifest);

  assert.equal(progress.done, 1);
  assert.equal(progress.percent, 8);
  assert.equal(progress.next?.id, "workspace");
});

test("completed resource-linked tasks are validated against recorded resources", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  const workspace = manifest.tasks.find(task => task.id === "workspace");
  assert.ok(workspace);
  workspace.status = "done";

  const issuesBefore = getProjectIssues(manifest);
  assert.equal(issuesBefore.length, 1);
  assert.equal(issuesBefore[0].code, "done_resource_missing");
  assert.equal(issuesBefore[0].resourceKey, "workspace");

  manifest.resources.workspace = {
    name: "foil-dev",
    id: "11111111-1111-1111-1111-111111111111"
  };

  assert.deepEqual(getProjectIssues(manifest), []);
});

test("handoff contains architecture, next action, resources and validation state", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  manifest.tasks[0].status = "done";
  manifest.tasks[1].status = "in_progress";
  manifest.resources.workspace = {
    name: "foil-dev",
    id: "workspace-guid"
  };

  const handoff = renderHandoff(manifest);

  assert.match(handoff, /oracle-vm -> kafka -> eventstream -> eventhouse -> lakehouse -> bronze -> silver -> gold -> sql -> power-bi/);
  assert.match(handoff, /Create or select Fabric workspace \(Foundation\) — status: in_progress/);
  assert.match(handoff, /\*\*workspace\*\*: foil-dev — workspace-guid/);
  assert.match(handoff, /No task\/resource consistency issues detected/);
  assert.match(handoff, /authoritative state is `fabric\.project\.json`/);
});

test("completed checklist has no next action", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  for (const task of manifest.tasks) {
    task.status = "done";
    if (task.resourceKey) {
      manifest.resources[task.resourceKey] = { name: task.resourceKey };
    }
  }

  const progress = getProgress(manifest);
  assert.equal(progress.done, progress.total);
  assert.equal(progress.percent, 100);
  assert.equal(progress.next, undefined);
  assert.match(renderHandoff(manifest), /Project checklist complete/);
});


test("next action respects task dependencies", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  manifest.tasks.find(task => task.id === "silver")!.status = "in_progress";

  const progress = getProgress(manifest);
  const issues = getProjectIssues(manifest);

  assert.equal(progress.next?.id, "fabric-login");
  assert.ok(issues.some(issue =>
    issue.code === "dependency_incomplete" &&
    issue.taskId === "silver" &&
    issue.dependencyId === "bronze"
  ));
});

test("completed task with incomplete dependency is reported", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  const silver = manifest.tasks.find(task => task.id === "silver")!;
  silver.status = "done";
  manifest.resources["notebook-silver"] = { name: "02-silver" };

  const issues = getProjectIssues(manifest);

  assert.ok(issues.some(issue =>
    issue.code === "dependency_incomplete" &&
    issue.taskId === "silver" &&
    issue.dependencyId === "bronze"
  ));
});
