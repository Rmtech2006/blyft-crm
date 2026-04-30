import { internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  buildLeadDuplicateKeys,
  getDueLeadFollowUps,
  getDueProjectDeadlines,
  getOverdueTasks,
  getStaleProposalLeads,
} from "../src/lib/crm-automation-rules.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const HIGH_VALUE_LEAD_THRESHOLD = 50000;
const DIGEST_USER_IDS = ["ritish", "eshaan"] as const;
const ACTIVE_TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"] as const;
const OPEN_LEAD_STAGES = [
  "LEAD_CAPTURED",
  "QUALIFICATION_SUBMITTED",
  "STRATEGY_CALL",
  "PROPOSAL_SENT",
  "NURTURE",
] as const;

type ReadCtx = QueryCtx | MutationCtx;

function istDayKey(now: number): string {
  return new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function leadLink(leadId: string): string {
  return `/leads/${leadId}`;
}

function taskLink(taskId: string): string {
  return `/tasks/${taskId}`;
}

function projectLink(projectId: string): string {
  return `/projects/${projectId}`;
}

function ownerForLead(lead: Doc<"leads">): string {
  return lead.ownerId ?? "ritish";
}

function formatLead(lead: Doc<"leads">) {
  return {
    ...lead,
    id: lead._id,
    link: leadLink(lead._id),
  };
}

function formatTask(task: Doc<"tasks">) {
  return {
    ...task,
    id: task._id,
    link: taskLink(task._id),
  };
}

function formatProject(
  project: Doc<"projects">,
  client?: Pick<Doc<"clients">, "_id" | "companyName"> | null
) {
  return {
    ...project,
    id: project._id,
    link: projectLink(project._id),
    client: client
      ? { id: client._id, companyName: client.companyName }
      : null,
  };
}

async function loadDueLeadFollowUps(ctx: ReadCtx, now: number) {
  const candidates = await ctx.db
    .query("leads")
    .withIndex("by_followUpDate", (q) => q.lt("followUpDate", now + 1))
    .take(100);

  return getDueLeadFollowUps(candidates, now).slice(0, 30);
}

async function loadStaleProposalLeads(ctx: ReadCtx, now: number) {
  const staleBefore = now - 2 * DAY_MS;
  const candidates = await ctx.db
    .query("leads")
    .withIndex("by_stage_and_followUpDate", (q) =>
      q.eq("stage", "PROPOSAL_SENT").lt("followUpDate", staleBefore + 1)
    )
    .take(50);

  return getStaleProposalLeads(candidates, now, 2).slice(0, 20);
}

async function loadOverdueTasks(ctx: ReadCtx, now: number) {
  const batches = await Promise.all(
    ACTIVE_TASK_STATUSES.map((status) =>
      ctx.db
        .query("tasks")
        .withIndex("by_status_and_dueDate", (q) =>
          q.eq("status", status).lt("dueDate", now)
        )
        .take(30)
    )
  );

  return getOverdueTasks(batches.flat(), now).slice(0, 30);
}

async function loadHighValueLeads(ctx: ReadCtx) {
  const batches = await Promise.all(
    OPEN_LEAD_STAGES.map((stage) =>
      ctx.db
        .query("leads")
        .withIndex("by_stage", (q) => q.eq("stage", stage))
        .take(25)
    )
  );

  return batches
    .flat()
    .filter((lead) => (lead.estimatedValue ?? 0) >= HIGH_VALUE_LEAD_THRESHOLD)
    .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0))
    .slice(0, 10);
}

async function loadDueProjectDeadlines(ctx: ReadCtx, now: number) {
  const projects = await ctx.db.query("projects").collect();
  const dueProjects: Doc<"projects">[] = getDueProjectDeadlines(projects, now, 7).slice(0, 20);

  return await Promise.all(
    dueProjects.map(async (project) => {
      const client = await ctx.db.get(project.clientId);
      return formatProject(project, client);
    })
  );
}

async function loadFocus(ctx: ReadCtx, now: number) {
  const [
    dueLeadFollowUps,
    staleProposals,
    overdueTasks,
    highValueLeads,
    dueProjectDeadlines,
  ] =
    await Promise.all([
      loadDueLeadFollowUps(ctx, now),
      loadStaleProposalLeads(ctx, now),
      loadOverdueTasks(ctx, now),
      loadHighValueLeads(ctx),
      loadDueProjectDeadlines(ctx, now),
    ]);

  return {
    generatedAt: now,
    dueLeadFollowUps,
    staleProposals,
    overdueTasks,
    highValueLeads,
    dueProjectDeadlines,
  };
}

async function upsertNotification(
  ctx: MutationCtx,
  input: {
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    dedupeKey: string;
    createdForDay: string;
  }
) {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_userId_and_dedupeKey", (q) =>
      q.eq("userId", input.userId).eq("dedupeKey", input.dedupeKey)
    )
    .take(1);

  const payload = {
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link,
    read: false,
    createdForDay: input.createdForDay,
  };

  if (existing[0]) {
    await ctx.db.patch(existing[0]._id, payload);
    return existing[0]._id;
  }

  return await ctx.db.insert("notifications", {
    userId: input.userId,
    dedupeKey: input.dedupeKey,
    ...payload,
  });
}

export const getTodaysFocus = query({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const focus = await loadFocus(ctx, now);

    return {
      generatedAt: focus.generatedAt,
      counts: {
        overdueTasks: focus.overdueTasks.length,
        dueLeadFollowUps: focus.dueLeadFollowUps.length,
        staleProposals: focus.staleProposals.length,
        highValueLeads: focus.highValueLeads.length,
        dueProjectDeadlines: focus.dueProjectDeadlines.length,
      },
      overdueTasks: focus.overdueTasks.slice(0, 8).map(formatTask),
      dueLeadFollowUps: focus.dueLeadFollowUps.slice(0, 8).map(formatLead),
      staleProposals: focus.staleProposals.slice(0, 6).map(formatLead),
      highValueLeads: focus.highValueLeads.slice(0, 6).map(formatLead),
      dueProjectDeadlines: focus.dueProjectDeadlines.slice(0, 6),
    };
  },
});

export const getDuplicateCandidates = query({
  args: {
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const keys = buildLeadDuplicateKeys(args);
    const matches = new Map<string, Doc<"leads">>();

    if (keys.emailKey) {
      const emailMatches = await ctx.db
        .query("leads")
        .withIndex("by_emailKey", (q) => q.eq("emailKey", keys.emailKey!))
        .take(5);
      for (const lead of emailMatches) matches.set(lead._id, lead);
    }

    if (keys.whatsappKey) {
      const whatsappMatches = await ctx.db
        .query("leads")
        .withIndex("by_whatsappKey", (q) => q.eq("whatsappKey", keys.whatsappKey!))
        .take(5);
      for (const lead of whatsappMatches) matches.set(lead._id, lead);
    }

    return [...matches.values()].map(formatLead);
  },
});

export const runMorningDigest = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const day = istDayKey(now);
    const focus = await loadFocus(ctx, now);
    const message = [
      `${focus.overdueTasks.length} overdue task${focus.overdueTasks.length === 1 ? "" : "s"}`,
      `${focus.dueLeadFollowUps.length} lead follow-up${focus.dueLeadFollowUps.length === 1 ? "" : "s"} due`,
      `${focus.staleProposals.length} stale proposal${focus.staleProposals.length === 1 ? "" : "s"}`,
      `${focus.highValueLeads.length} high-value lead${focus.highValueLeads.length === 1 ? "" : "s"}`,
      `${focus.dueProjectDeadlines.length} project deadline${focus.dueProjectDeadlines.length === 1 ? "" : "s"} this week`,
    ].join(", ");

    for (const userId of DIGEST_USER_IDS) {
      await upsertNotification(ctx, {
        userId,
        title: "Morning focus ready",
        message,
        type: "AUTOMATION_MORNING_DIGEST",
        link: "/",
        dedupeKey: `morning-focus:${day}:${userId}`,
        createdForDay: day,
      });
    }
  },
});

export const runFollowUpSweep = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const day = istDayKey(now);
    const [dueLeadFollowUps, staleProposals] = await Promise.all([
      loadDueLeadFollowUps(ctx, now),
      loadStaleProposalLeads(ctx, now),
    ]);

    for (const lead of dueLeadFollowUps.slice(0, 25)) {
      await upsertNotification(ctx, {
        userId: ownerForLead(lead),
        title: "Lead follow-up due",
        message: `${lead.name} is ready for follow-up.`,
        type: "LEAD_FOLLOWUP_DUE",
        link: leadLink(lead._id),
        dedupeKey: `lead-followup:${day}:${lead._id}`,
        createdForDay: day,
      });
    }

    for (const lead of staleProposals.slice(0, 25)) {
      await upsertNotification(ctx, {
        userId: ownerForLead(lead),
        title: "Proposal needs a nudge",
        message: `${lead.name} has been in proposal follow-up for more than 2 days.`,
        type: "LEAD_PROPOSAL_STALE",
        link: leadLink(lead._id),
        dedupeKey: `proposal-stale:${day}:${lead._id}`,
        createdForDay: day,
      });
    }
  },
});

export const runProjectDeadlineSweep = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const day = istDayKey(now);
    const dueProjectDeadlines = await loadDueProjectDeadlines(ctx, now);

    for (const project of dueProjectDeadlines.slice(0, 25)) {
      await upsertNotification(ctx, {
        userId: "ritish",
        title: "Project deadline due soon",
        message: `${project.name}${project.client ? ` for ${project.client.companyName}` : ""} is due by ${new Date(project.deadline ?? now).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })}.`,
        type: "PROJECT_DEADLINE_DUE",
        link: project.link,
        dedupeKey: `project-deadline:${day}:${project.id}`,
        createdForDay: day,
      });
    }
  },
});

export const runEveningSummary = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const day = istDayKey(now);
    const focus = await loadFocus(ctx, now);
    const message = [
      `Still pending: ${focus.overdueTasks.length} overdue task${focus.overdueTasks.length === 1 ? "" : "s"}`,
      `${focus.dueLeadFollowUps.length} lead follow-up${focus.dueLeadFollowUps.length === 1 ? "" : "s"}`,
      `${focus.staleProposals.length} proposal nudge${focus.staleProposals.length === 1 ? "" : "s"}`,
      `${focus.dueProjectDeadlines.length} project deadline${focus.dueProjectDeadlines.length === 1 ? "" : "s"} in the next 7 days`,
    ].join(", ");

    for (const userId of DIGEST_USER_IDS) {
      await upsertNotification(ctx, {
        userId,
        title: "Evening operations summary",
        message,
        type: "AUTOMATION_EVENING_SUMMARY",
        link: "/",
        dedupeKey: `evening-summary:${day}:${userId}`,
        createdForDay: day,
      });
    }
  },
});
