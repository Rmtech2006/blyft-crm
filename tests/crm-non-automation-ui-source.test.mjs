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

test("projects page has explicit open buttons for project cards", () => {
  const page = read("src/app/(dashboard)/projects/page.tsx");

  assert.match(page, /aria-label=\{`Open \$\{project\.name\}`\}/);
  assert.match(page, /event\.stopPropagation\(\)[\s\S]*onOpen\(\)/);
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

test("project detail supports managing team assignments directly", () => {
  const page = read("src/app/(dashboard)/projects/[id]/page.tsx");
  const dialog = read("src/components/projects/manage-project-team-dialog.tsx");
  const projects = read("convex/projects.ts");

  assert.match(page, /ManageProjectTeamDialog/);
  assert.match(page, /Assign team/);
  assert.match(dialog, /api\.projects\.setTeamMembers/);
  assert.match(dialog, /api\.team\.list/);
  assert.match(dialog, /Save team/);
  assert.match(projects, /export const setTeamMembers/);
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

test("lead detail makes WhatsApp actions easy to find", () => {
  const page = read("src/app/(dashboard)/leads/[id]/page.tsx");
  const leadsPage = read("src/app/(dashboard)/leads/page.tsx");
  const panel = read("src/components/leads/whatsapp-message-panel.tsx");

  assert.match(page, /Open WhatsApp/);
  assert.match(page, /toWhatsappLink/);
  assert.match(leadsPage, /openLeadWhatsapp/);
  assert.match(leadsPage, /WhatsApp/);
  assert.match(leadsPage, /stopPropagation/);
  assert.match(panel, /WhatsApp follow-up/);
  assert.match(panel, /Open chat/);
});

test("task assignment uses the real team directory", () => {
  const tasks = read("convex/tasks.ts");
  const addTaskDialog = read("src/components/tasks/add-task-dialog.tsx");

  assert.doesNotMatch(tasks, /const USERS:/);
  assert.doesNotMatch(tasks, /export const listUsers/);
  assert.match(tasks, /teamMembers/);
  assert.match(addTaskDialog, /api\.team\.list/);
  assert.doesNotMatch(addTaskDialog, /api\.tasks\.listUsers/);
});

test("tasks list tolerates legacy assignee strings", () => {
  const tasks = read("convex/tasks.ts");

  assert.match(tasks, /normalizeId\("teamMembers", assigneeId\)/);
});

test("finance transaction form links entries to clients and projects", () => {
  const dialog = read("src/components/finance/add-transaction-dialog.tsx");
  const finance = read("convex/finance.ts");

  assert.match(finance, /clientId: v\.optional\(v\.id\("clients"\)\)/);
  assert.match(finance, /projectId: v\.optional\(v\.id\("projects"\)\)/);
  assert.match(dialog, /api\.clients\.list/);
  assert.match(dialog, /api\.projects\.list/);
  assert.match(dialog, /clientId:/);
  assert.match(dialog, /projectId:/);
  assert.match(dialog, /Link to client/);
  assert.match(dialog, /Link to project/);
});

test("finance transaction edit form renders selected account client and project names", () => {
  const dialog = read("src/components/finance/add-transaction-dialog.tsx");

  assert.match(dialog, /selectedBankAccountLabel/);
  assert.match(dialog, /selectedClientLabel/);
  assert.match(dialog, /selectedProjectLabel/);
  assert.match(dialog, /bankAccounts\.find\(\(a\) => a\.id === bankAccountId\)/);
  assert.match(dialog, /selectedBankAccount\.name/);
  assert.match(dialog, /clients\.find\(\(client\) => client\.id === clientId\)\?\.companyName/);
  assert.match(dialog, /projects\.find\(\(project\) => project\.id === projectId\)\?\.name/);
});

test("client contact cards expose an edit dialog backed by Convex updateContact", () => {
  const page = read("src/app/(dashboard)/clients/[id]/page.tsx");
  const dialog = read("src/components/clients/edit-client-contact-dialog.tsx");
  const clients = read("convex/clients.ts");

  assert.match(clients, /export const updateContact/);
  assert.match(clients, /id: v\.id\("clientContacts"\)/);
  assert.match(dialog, /export function EditClientContactDialog/);
  assert.match(dialog, /api\.clients\.updateContact/);
  assert.match(dialog, /Contact updated/);
  assert.match(page, /EditClientContactDialog/);
});

test("tasks expose edit dialogs for task details, subtasks, and comments", () => {
  const listPage = read("src/app/(dashboard)/tasks/page.tsx");
  const detailPage = read("src/app/(dashboard)/tasks/[id]/page.tsx");
  const taskDialog = read("src/components/tasks/edit-task-dialog.tsx");
  const inlineDialog = read("src/components/shared/edit-text-dialog.tsx");
  const tasks = read("convex/tasks.ts");

  assert.match(tasks, /export const updateSubtask/);
  assert.match(tasks, /export const updateComment/);
  assert.match(taskDialog, /api\.tasks\.update/);
  assert.match(taskDialog, /Task updated/);
  assert.match(inlineDialog, /export function EditTextDialog/);
  assert.match(detailPage, /EditTaskDialog/);
  assert.match(detailPage, /EditTextDialog/);
  assert.match(listPage, /EditTaskDialog/);
});

test("project milestones can be edited and deleted from project detail", () => {
  const page = read("src/app/(dashboard)/projects/[id]/page.tsx");
  const dialog = read("src/components/projects/edit-milestone-dialog.tsx");
  const projects = read("convex/projects.ts");

  assert.match(projects, /export const updateMilestone/);
  assert.match(projects, /export const removeMilestone/);
  assert.match(dialog, /api\.projects\.updateMilestone/);
  assert.match(dialog, /Milestone updated/);
  assert.match(page, /EditMilestoneDialog/);
  assert.match(page, /removeMilestone/);
});

test("client and lead notes plus lead call logs expose edit and delete actions", () => {
  const clientPage = read("src/app/(dashboard)/clients/[id]/page.tsx");
  const leadPage = read("src/app/(dashboard)/leads/[id]/page.tsx");
  const clients = read("convex/clients.ts");
  const leads = read("convex/leads.ts");

  assert.match(clients, /export const updateNote/);
  assert.match(clients, /export const removeNote/);
  assert.match(leads, /export const updateNote/);
  assert.match(leads, /export const removeNote/);
  assert.match(leads, /export const updateCallLog/);
  assert.match(leads, /export const removeCallLog/);
  assert.match(clientPage, /EditTextDialog/);
  assert.match(clientPage, /removeNote/);
  assert.match(leadPage, /EditTextDialog/);
  assert.match(leadPage, /removeCallLog/);
});

test("reimbursements, petty cash, and bank accounts expose edit options", () => {
  const reimbursementsPage = read("src/app/(dashboard)/reimbursements/page.tsx");
  const financePage = read("src/app/(dashboard)/finance/page.tsx");
  const reimbursementDialog = read("src/components/reimbursements/edit-reimbursement-dialog.tsx");
  const finance = read("convex/finance.ts");
  const reimbursements = read("convex/reimbursements.ts");

  assert.match(reimbursements, /export const update/);
  assert.match(reimbursementDialog, /api\.reimbursements\.update/);
  assert.match(reimbursementDialog, /Reimbursement updated/);
  assert.match(reimbursementsPage, /EditReimbursementDialog/);
  assert.match(finance, /export const updateBankAccount/);
  assert.match(finance, /export const updatePettyCash/);
  assert.match(financePage, /EditBankAccountDialog/);
  assert.match(financePage, /EditPettyCashDialog/);
});
