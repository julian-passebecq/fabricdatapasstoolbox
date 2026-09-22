import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultFoilManifest,
  getProgress,
  getProjectIssues,
  getReadyTasks,
  getUnmetDependencies,
  renderHandoff,
  transitionTaskStatus,
  validateManifestDocument
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
  const login = manifest.tasks.find(task => task.id === "fabric-login");
  const workspace = manifest.tasks.find(task => task.id === "workspace");
  assert.ok(login);
  assert.ok(workspace);
  login.status = "done";
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
  assert.match(handoff, /No task\/resource or dependency-sequencing issues detected/);
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


test("ready task helpers expose blocked and actionable steps", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  const silver = manifest.tasks.find(task => task.id === "silver")!;

  assert.deepEqual(getUnmetDependencies(manifest, silver).map(task => task.id), ["bronze"]);
  assert.deepEqual(getReadyTasks(manifest).map(task => task.id), ["fabric-login"]);

  manifest.tasks.find(task => task.id === "fabric-login")!.status = "done";
  assert.ok(getReadyTasks(manifest).some(task => task.id === "workspace"));
});


test("manifest validation rejects malformed documents", () => {
  const errors = validateManifestDocument({
    schemaVersion: 99,
    project: {},
    architecture: {},
    resources: [],
    tasks: "not-an-array",
    decisions: {}
  });

  assert.ok(errors.some(error => error.includes("schemaVersion")));
  assert.ok(errors.some(error => error.includes("project.name")));
  assert.ok(errors.some(error => error.includes("architecture.source")));
  assert.ok(errors.some(error => error.includes("resources must be an object")));
  assert.ok(errors.some(error => error.includes("tasks must be an array")));
  assert.ok(errors.some(error => error.includes("decisions must be an array")));
});

test("project issues catch missing dependencies and duplicate task ids", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  manifest.tasks[1].id = manifest.tasks[0].id;
  manifest.tasks.find(task => task.id === "silver")!.dependsOn = ["missing-bronze"];

  const issues = getProjectIssues(manifest);

  assert.ok(issues.some(issue => issue.code === "duplicate_task_id"));
  assert.ok(issues.some(issue =>
    issue.code === "dependency_missing" &&
    issue.dependencyId === "missing-bronze"
  ));
});

test("project issues catch dependency cycles", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  const login = manifest.tasks.find(task => task.id === "fabric-login")!;
  login.dependsOn = ["workspace"];

  const issues = getProjectIssues(manifest);

  assert.ok(issues.some(issue => issue.code === "dependency_cycle"));
  assert.equal(getReadyTasks(manifest).length, 0);
});


test("task status transitions record auditable timestamps", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  const task = manifest.tasks.find(item => item.id === "fabric-login")!;

  transitionTaskStatus(task, "in_progress", "2026-09-22T10:00:00.000Z");
  assert.equal(task.status, "in_progress");
  assert.equal(task.statusChangedAt, "2026-09-22T10:00:00.000Z");
  assert.equal(task.completedAt, undefined);

  transitionTaskStatus(task, "done", "2026-09-22T10:05:00.000Z");
  assert.equal(task.completedAt, "2026-09-22T10:05:00.000Z");
  assert.equal(task.statusChangedAt, "2026-09-22T10:05:00.000Z");

  transitionTaskStatus(task, "todo", "2026-09-22T10:10:00.000Z");
  assert.equal(task.completedAt, undefined);
  assert.equal(task.statusChangedAt, "2026-09-22T10:10:00.000Z");
});

test("handoff includes recent task activity when transitions were recorded", () => {
  const manifest = defaultFoilManifest("2026-09-22T00:00:00.000Z");
  const task = manifest.tasks.find(item => item.id === "fabric-login")!;
  transitionTaskStatus(task, "done", "2026-09-22T10:05:00.000Z");

  const handoff = renderHandoff(manifest);

  assert.match(handoff, /## Recent task activity/);
  assert.match(
    handoff,
    /2026-09-22T10:05:00.000Z — Sign in to Microsoft Fabric: done/
  );
});
