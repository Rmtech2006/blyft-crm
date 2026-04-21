import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTodaysFocus } from "./todays-focus.mjs";

test("normalizeTodaysFocus fills missing focus arrays and counts", () => {
  const focus = normalizeTodaysFocus({
    generatedAt: 1713600000000,
    overdueTasks: [{ id: "task-1", title: "Fix brief", priority: "HIGH", link: "/tasks/task-1" }],
    counts: {
      overdueTasks: 1,
    },
  });

  assert.equal(focus.generatedAt, 1713600000000);
  assert.equal(focus.counts.overdueTasks, 1);
  assert.equal(focus.counts.dueLeadFollowUps, 0);
  assert.equal(focus.counts.staleProposals, 0);
  assert.equal(focus.counts.highValueLeads, 0);
  assert.equal(focus.counts.dueProjectDeadlines, 0);
  assert.deepEqual(focus.dueLeadFollowUps, []);
  assert.deepEqual(focus.staleProposals, []);
  assert.deepEqual(focus.highValueLeads, []);
  assert.deepEqual(focus.dueProjectDeadlines, []);
});
