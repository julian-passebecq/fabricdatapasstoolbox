import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectFromTemplate,
  defaultContosoManifest,
  getProjectTemplateStatus,
  PROJECT_TEMPLATES
} from "../src/projectTemplates";
import {
  getProgress,
  getProjectIssues
} from "../src/projectModel";

test("template registry exposes distinct realtime and batch architectures", () => {
  assert.deepEqual(
    PROJECT_TEMPLATES.map(template => template.id),
    ["foil-wind-realtime", "contoso-batch-medallion"]
  );

  const foil = createProjectFromTemplate("foil-wind-realtime", "2026-09-22T00:00:00.000Z");
  const contoso = createProjectFromTemplate("contoso-batch-medallion", "2026-09-22T00:00:00.000Z");

  assert.equal(foil.project.templateId, "foil-wind-realtime");
  assert.equal(contoso.project.templateId, "contoso-batch-medallion");
  assert.deepEqual(foil.architecture.ingestion, ["eventstream"]);
  assert.deepEqual(contoso.architecture.ingestion, ["data-pipeline"]);
  assert.deepEqual(contoso.architecture.storage, ["lakehouse", "warehouse"]);
});

test("Contoso template starts valid with Fabric Data Pipeline and Warehouse tasks", () => {
  const manifest = defaultContosoManifest("2026-09-22T00:00:00.000Z");
  const progress = getProgress(manifest);

  assert.equal(manifest.project.name, "contoso-fabric");
  assert.equal(manifest.project.type, "batch-medallion");
  assert.ok(manifest.tasks.some(task =>
    task.id === "pipeline" &&
    task.resourceKey === "data-pipeline"
  ));
  assert.ok(manifest.tasks.some(task =>
    task.id === "warehouse" &&
    task.resourceKey === "warehouse"
  ));
  assert.equal(progress.next?.id, "fabric-login");
  assert.deepEqual(getProjectIssues(manifest), []);
});


test("template status is conservative and never assumes migration", () => {
  const manifest = createProjectFromTemplate(
    "foil-wind-realtime",
    "2026-09-22T00:00:00.000Z"
  );

  assert.equal(getProjectTemplateStatus(manifest).kind, "current");

  const custom = structuredClone(manifest);
  delete custom.project.templateId;
  delete custom.project.templateVersion;
  assert.equal(getProjectTemplateStatus(custom).kind, "custom");

  const unknown = structuredClone(manifest);
  unknown.project.templateId = "private-template";
  assert.equal(getProjectTemplateStatus(unknown).kind, "unknown");

  const ahead = structuredClone(manifest);
  ahead.project.templateVersion = 2;
  assert.equal(getProjectTemplateStatus(ahead).kind, "ahead");
});
