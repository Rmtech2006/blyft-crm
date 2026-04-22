import { query, mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  buildLeadDuplicateKeys,
  getDefaultLeadFollowUpDate,
  type LeadDuplicateKeys,
} from "../src/lib/crm-automation-rules.mjs";

const USERS: Record<string, { id: string; name: string }> = {
  ritish: { id: "ritish", name: "Ritish" },
  eshaan: { id: "eshaan", name: "Eshaan" },
};

function istDayKey(now: number): string {
  return new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function findDuplicateLead(
  ctx: MutationCtx,
  keys: LeadDuplicateKeys
): Promise<Doc<"leads"> | null> {
  if (keys.emailKey) {
    const matches = await ctx.db
      .query("leads")
      .withIndex("by_emailKey", (q) => q.eq("emailKey", keys.emailKey!))
      .take(1);
    if (matches[0]) return matches[0];
  }

  if (keys.whatsappKey) {
    const matches = await ctx.db
      .query("leads")
      .withIndex("by_whatsappKey", (q) => q.eq("whatsappKey", keys.whatsappKey!))
      .take(1);
    if (matches[0]) return matches[0];
  }

  return null;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").order("desc").collect();
    return leads.map((lead) => ({
      ...lead,
      id: lead._id,
      owner: lead.ownerId ? (USERS[lead.ownerId] ?? null) : null,
    }));
  },
});

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) return null;
    const notes = await ctx.db
      .query("leadNotes")
      .withIndex("by_leadId", (q) => q.eq("leadId", args.id))
      .order("desc")
      .collect();
    const callLogs = await ctx.db
      .query("leadCallLogs")
      .withIndex("by_leadId", (q) => q.eq("leadId", args.id))
      .order("desc")
      .collect();
    return {
      ...lead,
      id: lead._id,
      owner: lead.ownerId ? (USERS[lead.ownerId] ?? null) : null,
      notes: notes.map((n) => ({ ...n, id: n._id, createdAt: n._creationTime })),
      callLogs: callLogs.map((c) => ({ ...c, id: c._id })),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    source: v.union(
      v.literal("INSTAGRAM"), v.literal("REFERRAL"), v.literal("LINKEDIN"),
      v.literal("COLD_EMAIL"), v.literal("EVENT"), v.literal("WEBSITE"), v.literal("OTHER")
    ),
    stage: v.union(
      v.literal("LEAD_CAPTURED"),
      v.literal("QUALIFICATION_SUBMITTED"),
      v.literal("STRATEGY_CALL"),
      v.literal("PROPOSAL_SENT"),
      v.literal("PROPOSAL_ACCEPTED"),
      v.literal("NURTURE"),
      v.literal("LOST")
    ),
    contactName: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    serviceType: v.optional(v.string()),
    followUpDate: v.optional(v.number()),
    ownerId: v.optional(v.string()),
    goals: v.optional(v.string()),
    budget: v.optional(v.string()),
    servicesRequired: v.optional(v.string()),
    timeline: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const duplicateKeys = buildLeadDuplicateKeys(args);
    const duplicate = await findDuplicateLead(ctx, duplicateKeys);
    const leadId = await ctx.db.insert("leads", {
      ...args,
      followUpDate: args.followUpDate ?? getDefaultLeadFollowUpDate(now),
      emailKey: duplicateKeys.emailKey ?? undefined,
      whatsappKey: duplicateKeys.whatsappKey ?? undefined,
      duplicateOfLeadId: duplicate?._id,
    });

    await ctx.db.insert("notifications", {
      userId: args.ownerId ?? "ritish",
      title: duplicate ? "Possible duplicate lead" : "New lead captured",
      message: duplicate
        ? `${args.name} may already exist as ${duplicate.name}. Check before creating a second conversation.`
        : `${args.name} needs a first follow-up tomorrow.`,
      type: duplicate ? "LEAD_DUPLICATE" : "NEW_LEAD",
      read: false,
      link: `/leads/${leadId}`,
      dedupeKey: `lead-created:${leadId}`,
      createdForDay: istDayKey(now),
    });

    return leadId;
  },
});

export const update = mutation({
  args: {
    id: v.id("leads"),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    source: v.optional(v.union(
      v.literal("INSTAGRAM"), v.literal("REFERRAL"), v.literal("LINKEDIN"),
      v.literal("COLD_EMAIL"), v.literal("EVENT"), v.literal("WEBSITE"), v.literal("OTHER")
    )),
    stage: v.optional(v.union(
      v.literal("LEAD_CAPTURED"),
      v.literal("QUALIFICATION_SUBMITTED"),
      v.literal("STRATEGY_CALL"),
      v.literal("PROPOSAL_SENT"),
      v.literal("PROPOSAL_ACCEPTED"),
      v.literal("NURTURE"),
      v.literal("LOST")
    )),
    contactName: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    serviceType: v.optional(v.string()),
    followUpDate: v.optional(v.number()),
    lostReason: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    goals: v.optional(v.string()),
    budget: v.optional(v.string()),
    servicesRequired: v.optional(v.string()),
    timeline: v.optional(v.string()),
    qualificationSubmittedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const patch: Record<string, unknown> = { ...rest };
    if (rest.email !== undefined || rest.whatsapp !== undefined) {
      const existing = await ctx.db.get(id);
      const duplicateKeys = buildLeadDuplicateKeys({
        email: rest.email ?? existing?.email,
        whatsapp: rest.whatsapp ?? existing?.whatsapp,
      });
      patch.emailKey = duplicateKeys.emailKey ?? undefined;
      patch.whatsappKey = duplicateKeys.whatsappKey ?? undefined;
    }
    // Auto-stamp qualification submission and advance stage
    if (
      (rest.goals || rest.budget || rest.servicesRequired || rest.timeline) &&
      !rest.qualificationSubmittedAt
    ) {
      const existing = await ctx.db.get(id);
      if (existing && !existing.qualificationSubmittedAt) {
        patch.qualificationSubmittedAt = Date.now();
        if (existing.stage === "LEAD_CAPTURED" && !patch.stage) {
          patch.stage = "QUALIFICATION_SUBMITTED";
        }
      }
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const notes = await ctx.db.query("leadNotes").withIndex("by_leadId", (q) => q.eq("leadId", args.id)).collect();
    for (const n of notes) await ctx.db.delete(n._id);
    const calls = await ctx.db.query("leadCallLogs").withIndex("by_leadId", (q) => q.eq("leadId", args.id)).collect();
    for (const c of calls) await ctx.db.delete(c._id);
    await ctx.db.delete(args.id);
  },
});

export const addNote = mutation({
  args: { leadId: v.id("leads"), content: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leadNotes", { leadId: args.leadId, content: args.content });
  },
});

export const updateNote = mutation({
  args: { id: v.id("leadNotes"), content: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { content: args.content });
  },
});

export const removeNote = mutation({
  args: { id: v.id("leadNotes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const addCallLog = mutation({
  args: { leadId: v.id("leads"), summary: v.string(), callDate: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leadCallLogs", {
      leadId: args.leadId,
      summary: args.summary,
      callDate: args.callDate,
    });
  },
});

export const updateCallLog = mutation({
  args: { id: v.id("leadCallLogs"), summary: v.string(), callDate: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      summary: args.summary,
      callDate: args.callDate,
    });
  },
});

export const removeCallLog = mutation({
  args: { id: v.id("leadCallLogs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const convertToClient = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("Lead not found");

    const clientId = await ctx.db.insert("clients", {
      companyName: lead.company ?? lead.name,
      industry: lead.industry,
      status: "ONBOARDING",
      startDate: Date.now(),
      contractSigned: false,
      invoicePaid: false,
      onboardingFormSubmitted: false,
      accessGranted: false,
      kickoffDone: false,
      firstDeliverableSent: false,
    });

    if (lead.contactName || lead.email || lead.whatsapp) {
      await ctx.db.insert("clientContacts", {
        clientId,
        name: lead.contactName ?? lead.name,
        email: lead.email,
        whatsapp: lead.whatsapp,
        isPrimary: true,
      });
    }

    await ctx.db.patch(args.id, {
      stage: "PROPOSAL_ACCEPTED",
      convertedClientId: clientId,
    });

    return clientId;
  },
});
