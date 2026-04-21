import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLeadDuplicateKeys,
  buildLeadWhatsappMessages,
  getDefaultLeadFollowUpDate,
  getDueLeadFollowUps,
  getDueProjectDeadlines,
  getOverdueTasks,
  getStaleProposalLeads,
  toWhatsappLink,
} from "./crm-automation-rules.mjs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-04-20T04:30:00.000Z");

test("sets first lead follow-up for the next day", () => {
  assert.equal(
    getDefaultLeadFollowUpDate(Date.parse("2026-04-20T10:00:00.000Z")),
    Date.parse("2026-04-21T10:00:00.000Z"),
  );
});

test("finds due lead follow-ups and skips terminal stages", () => {
  const leads = [
    { id: "future", name: "Future", stage: "LEAD_CAPTURED", followUpDate: NOW + DAY },
    { id: "lost", name: "Lost", stage: "LOST", followUpDate: NOW - DAY },
    { id: "accepted", name: "Accepted", stage: "PROPOSAL_ACCEPTED", followUpDate: NOW - DAY },
    { id: "due", name: "Due", stage: "QUALIFICATION_SUBMITTED", followUpDate: NOW },
    { id: "old", name: "Old", stage: "PROPOSAL_SENT", followUpDate: NOW - DAY, estimatedValue: 90000 },
  ];

  assert.deepEqual(getDueLeadFollowUps(leads, NOW).map((lead) => lead.id), ["old", "due"]);
});

test("finds stale proposal leads after the proposal follow-up window", () => {
  const leads = [
    { id: "fresh", name: "Fresh", stage: "PROPOSAL_SENT", followUpDate: NOW - DAY },
    { id: "stale", name: "Stale", stage: "PROPOSAL_SENT", followUpDate: NOW - 3 * DAY },
    { id: "wrong-stage", name: "Wrong", stage: "STRATEGY_CALL", followUpDate: NOW - 4 * DAY },
  ];

  assert.deepEqual(getStaleProposalLeads(leads, NOW, 2).map((lead) => lead.id), ["stale"]);
});

test("finds overdue tasks and ignores completed work", () => {
  const tasks = [
    { id: "done", title: "Done", status: "DONE", dueDate: NOW - DAY },
    { id: "future", title: "Future", status: "TODO", dueDate: NOW + DAY },
    { id: "old", title: "Old", status: "TODO", dueDate: NOW - DAY, priority: "HIGH" },
    { id: "blocked", title: "Blocked", status: "BLOCKED", dueDate: NOW - 2 * DAY, priority: "CRITICAL" },
  ];

  assert.deepEqual(getOverdueTasks(tasks, NOW).map((task) => task.id), ["blocked", "old"]);
});

test("finds due-soon project deadlines and ignores archived or completed projects", () => {
  const projects = [
    { id: "future", name: "Future", status: "IN_PROGRESS", deadline: NOW + 10 * DAY },
    { id: "none", name: "None", status: "IN_PROGRESS", deadline: null },
    { id: "completed", name: "Completed", status: "COMPLETED", deadline: NOW + DAY },
    { id: "archived", name: "Archived", status: "IN_PROGRESS", deadline: NOW + DAY, archivedAt: NOW - DAY },
    { id: "soon", name: "Soon", status: "IN_PROGRESS", deadline: NOW + 2 * DAY },
    { id: "review", name: "Review", status: "IN_REVIEW", deadline: NOW + DAY },
  ];

  assert.deepEqual(getDueProjectDeadlines(projects, NOW, 7).map((project) => project.id), ["review", "soon"]);
});

test("builds normalized duplicate keys from email and WhatsApp", () => {
  assert.deepEqual(
    buildLeadDuplicateKeys({
      email: "  Sales@Example.COM ",
      whatsapp: "+91 98765 43210",
    }),
    {
      emailKey: "sales@example.com",
      whatsappKey: "919876543210",
    },
  );
});

test("creates WhatsApp links with safe encoded text", () => {
  assert.equal(
    toWhatsappLink("+91 98765 43210", "Hi Rahul, quick follow-up?"),
    "https://wa.me/919876543210?text=Hi%20Rahul%2C%20quick%20follow-up%3F",
  );
  assert.equal(toWhatsappLink("", "Hi"), null);
});

test("builds manual WhatsApp follow-up messages for lead stages", () => {
  const messages = buildLeadWhatsappMessages({
    name: "Rahul",
    contactName: "Rahul Shah",
    company: "Acme Foods",
    serviceType: "SEO",
    stage: "PROPOSAL_SENT",
    whatsapp: "9876543210",
  });

  assert.deepEqual(
    messages.map((message) => message.kind),
    ["first_follow_up", "proposal_reminder", "revival"],
  );
  assert.match(messages[0].text, /Rahul Shah/);
  assert.match(messages[0].text, /SEO/);
  assert.equal(messages[1].url.startsWith("https://wa.me/919876543210?text="), true);
});
