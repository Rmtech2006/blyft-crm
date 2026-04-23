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
  assert.match(crons, /morning focus digest/);
  assert.match(crons, /follow-up sweep/);
  assert.match(crons, /evening operations summary/);
});

test("lead creation applies free automation rules", () => {
  const leads = read("convex/leads.ts");

  assert.match(leads, /getDefaultLeadFollowUpDate/);
  assert.match(leads, /buildLeadDuplicateKeys/);
  assert.match(leads, /duplicate/i);
});

test("dashboard and lead detail expose phase 1-3 helpers", () => {
  const dashboard = read("src/app/(dashboard)/page.tsx");
  const leadDetail = read("src/app/(dashboard)/leads/[id]/page.tsx");
  const focusComponent = read("src/components/dashboard/todays-focus.tsx");
  const whatsappPanel = read("src/components/leads/whatsapp-message-panel.tsx");

  assert.match(dashboard, /TodaysFocus/);
  assert.match(focusComponent, /api\.automation\.getTodaysFocus/);
  assert.match(leadDetail, /WhatsappMessagePanel/);
  assert.match(whatsappPanel, /buildLeadWhatsappMessages/);
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
