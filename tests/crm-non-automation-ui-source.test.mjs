import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  assert.equal(existsSync(path), true, `${path} should exist`);
  return readFileSync(path, "utf8");
}

test("project detail exposes an edit project dialog backed by Convex update", () => {
  const dialog = read("src/components/projects/edit-project-dialog.tsx");
  const page = read("src/app/(dashboard)/projects/[id]/page.tsx");
  const projects = read("convex/projects.ts");

  assert.match(dialog, /export function EditProjectDialog/);
  assert.match(dialog, /api\.projects\.update/);
  assert.match(dialog, /Project updated/);
  assert.match(page, /EditProjectDialog/);
  assert.match(projects, /clientId: v\.optional\(v\.id\("clients"\)\)/);
});

test("settings exposes a CRM guide module for every core area", () => {
  const guide = read("src/components/settings/crm-guide.tsx");
  const settings = read("src/app/(dashboard)/settings/page.tsx");

  assert.match(settings, /value="crm-guide"/);
  assert.match(settings, /CRM Guide/);
  assert.match(settings, /<CrmGuide/);

  for (const section of [
    "Dashboard",
    "Leads",
    "Clients",
    "Projects",
    "Tasks",
    "Finance",
    "Reimbursements",
    "Team",
    "Templates",
    "Settings",
    "Automations",
  ]) {
    assert.match(guide, new RegExp(section));
  }
});
