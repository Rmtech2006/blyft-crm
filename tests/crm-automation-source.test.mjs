import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  assert.equal(existsSync(path), true, `${path} should exist`);
  return readFileSync(path, "utf8");
}

test("Convex automation backend has crons and focus query", () => {
  const automation = read("convex/automation.ts");
  const crons = read("convex/crons.ts");

  assert.match(automation, /export const getTodaysFocus/);
  assert.match(automation, /export const runMorningDigest/);
  assert.match(automation, /export const runFollowUpSweep/);
  assert.match(automation, /export const runEveningSummary/);
  assert.match(automation, /runProjectDeadlineSweep/);
  assert.match(automation, /dueProjectDeadlines/);
  assert.match(crons, /morning focus digest/);
  assert.match(crons, /follow-up sweep/);
  assert.match(crons, /evening operations summary/);
  assert.match(crons, /project deadline sweep/);
});

test("lead creation applies free automation rules", () => {
  const leads = read("convex/leads.ts");

  assert.match(leads, /getDefaultLeadFollowUpDate/);
  assert.match(leads, /buildLeadDuplicateKeys/);
  assert.match(leads, /duplicate/i);
});

test("lead quick follow-up workflow is wired on detail page", () => {
  const leads = read("convex/leads.ts");
  const leadDetail = read("src/app/(dashboard)/leads/[id]/page.tsx");

  assert.match(leads, /export const setFollowUpDate/);
  assert.match(leadDetail, /api\.leads\.setFollowUpDate/);
  assert.match(leadDetail, /Follow-up actions/);
  assert.match(leadDetail, /Followed up today/);
  assert.match(leadDetail, /Tomorrow/);
  assert.match(leadDetail, /In 3 days/);
  assert.match(leadDetail, /Next week/);
});

test("lead duplicate refresh avoids self-linking during contact updates", () => {
  const leads = read("convex/leads.ts");

  assert.match(leads, /duplicateOfLeadId/);
  assert.match(leads, /excludeLeadId/);
  assert.match(leads, /duplicate\._id !== excludeLeadId/);
});

test("dashboard and lead detail expose phase 1-3 helpers", () => {
  const dashboard = read("src/app/(dashboard)/page.tsx");
  const leadDetail = read("src/app/(dashboard)/leads/[id]/page.tsx");
  const focusComponent = read("src/components/dashboard/todays-focus.tsx");
  const whatsappPanel = read("src/components/leads/whatsapp-message-panel.tsx");
  const notifications = read("src/components/layout/notification-panel.tsx");

  assert.doesNotMatch(dashboard, /<TodaysFocus/);
  assert.match(dashboard, /Executive overview/);
  assert.match(dashboard, /Your agency control room is live/);
  assert.match(dashboard, /BLYFT workspace/);
  assert.match(focusComponent, /api\.automation\.getTodaysFocus/);
  assert.match(focusComponent, /Project deadlines/);
  assert.match(leadDetail, /WhatsappMessagePanel/);
  assert.match(whatsappPanel, /buildLeadWhatsappMessages/);
  assert.match(notifications, /AUTOMATION_MORNING_DIGEST/);
  assert.match(notifications, /PROJECT_DEADLINE_DUE/);
});

test("dashboard stats queries stay bounded and index-backed", () => {
  const dashboard = read("convex/dashboard.ts");
  const schema = read("convex/schema.ts");

  assert.match(schema, /index\("by_deadline", \["deadline"\]\)/);
  assert.match(schema, /index\("by_status_and_deadline", \["status", "deadline"\]\)/);
  assert.match(schema, /index\("by_type_and_date", \["type", "date"\]\)/);
  assert.match(dashboard, /withIndex\("by_type_and_date"/);
  assert.match(dashboard, /withIndex\("by_status_and_dueDate"/);
});
