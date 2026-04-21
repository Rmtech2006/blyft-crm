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

test("projects page exposes quick edit, archive, restore, delete, and stronger filters", () => {
  const page = read("src/app/(dashboard)/projects/page.tsx");
  const projects = read("convex/projects.ts");
  const schema = read("convex/schema.ts");

  assert.match(schema, /archivedAt: v\.optional\(v\.number\(\)\)/);
  assert.match(projects, /export const archive/);
  assert.match(projects, /export const restore/);
  assert.match(page, /EditProjectDialog/);
  assert.match(page, /api\.projects\.archive/);
  assert.match(page, /api\.projects\.restore/);
  assert.match(page, /api\.projects\.remove/);
  assert.match(page, /lifecycleFilter/);
  assert.match(page, /deadlineFilter/);
  assert.match(page, /Missing deadline/);
  assert.match(page, /Project archived/);
  assert.match(page, /Project restored/);
  assert.match(page, /Project deleted/);
});

test("project detail exposes safe archive restore and delete controls", () => {
  const page = read("src/app/(dashboard)/projects/[id]/page.tsx");

  assert.match(page, /api\.projects\.archive/);
  assert.match(page, /api\.projects\.restore/);
  assert.match(page, /api\.projects\.remove/);
  assert.match(page, /Project archived/);
  assert.match(page, /Project restored/);
  assert.match(page, /Project deleted/);
  assert.match(page, /router\.push\('\/projects'\)/);
  assert.match(page, /AlertDialog/);
});

test("project detail includes a timeline from tasks and milestones", () => {
  const page = read("src/app/(dashboard)/projects/[id]/page.tsx");

  assert.match(page, /projectTimelineItems/);
  assert.match(page, /Project Timeline/);
  assert.match(page, /Milestone/);
  assert.match(page, /Task/);
});

test("crm guide includes operating routines beyond module descriptions", () => {
  const guide = read("src/components/settings/crm-guide.tsx");

  for (const section of [
    "Daily Start",
    "Daily Close",
    "Weekly Cleanup",
    "Project Hygiene",
    "Finance Hygiene",
    "Automation Readiness",
  ]) {
    assert.match(guide, new RegExp(section));
  }
});

test("settings exposes a dedicated automation center", () => {
  const settings = read("src/app/(dashboard)/settings/page.tsx");
  const automationCenter = read("src/components/settings/automation-center.tsx");

  assert.match(settings, /value="automation-center"/);
  assert.match(settings, /Automation Center/);
  assert.match(settings, /<AutomationCenter/);
  assert.match(automationCenter, /Zero-cost stack/);
  assert.match(automationCenter, /n8n/);
  assert.match(automationCenter, /Project deadline sweep/);
});
