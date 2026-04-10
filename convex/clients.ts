import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").order("desc").take(150);
    return await Promise.all(
      clients.map(async (client) => {
        const contacts = await ctx.db
          .query("clientContacts")
          .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
          .collect();
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
          .collect();
        return {
          ...client,
          id: client._id,
          contacts: contacts.map((c) => ({ ...c, id: c._id })),
          projects: projects.map((p) => ({ ...p, id: p._id })),
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.id);
    if (!client) return null;
    const contacts = await ctx.db
      .query("clientContacts")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.id))
      .collect();
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.id))
      .collect();
    const notes = await ctx.db
      .query("clientNotes")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.id))
      .order("desc")
      .collect();
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.id))
      .collect();
    return {
      ...client,
      id: client._id,
      contacts: contacts.map((c) => ({ ...c, id: c._id })),
      projects: projects.map((p) => ({ ...p, id: p._id })),
      notes: notes.map((n) => ({ ...n, id: n._id, createdAt: n._creationTime })),
      transactions: transactions.map((t) => ({ ...t, id: t._id })),
    };
  },
});

export const create = mutation({
  args: {
    companyName: v.string(),
    industry: v.optional(v.string()),
    gstNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("ACTIVE"), v.literal("PAUSED"), v.literal("COMPLETED"), v.literal("PROSPECT"), v.literal("ONBOARDING")
    )),
    retainerAmount: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clients", {
      companyName: args.companyName,
      industry: args.industry,
      gstNumber: args.gstNumber,
      website: args.website,
      address: args.address,
      status: args.status ?? "PROSPECT",
      retainerAmount: args.retainerAmount,
      paymentTerms: args.paymentTerms,
      startDate: args.startDate,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    companyName: v.optional(v.string()),
    industry: v.optional(v.string()),
    gstNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("ACTIVE"), v.literal("PAUSED"), v.literal("COMPLETED"), v.literal("PROSPECT"), v.literal("ONBOARDING")
    )),
    retainerAmount: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    startDate: v.optional(v.number()),
    retainerEndDate: v.optional(v.number()),
    healthScore: v.optional(v.number()),
    contractSigned: v.optional(v.boolean()),
    invoicePaid: v.optional(v.boolean()),
    onboardingFormSubmitted: v.optional(v.boolean()),
    accessGranted: v.optional(v.boolean()),
    kickoffDone: v.optional(v.boolean()),
    firstDeliverableSent: v.optional(v.boolean()),
    onboardingManager: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    // Auto-promote to ACTIVE once onboarding fully complete
    const updated = await ctx.db.get(id);
    if (
      updated &&
      updated.status === "ONBOARDING" &&
      updated.contractSigned &&
      updated.invoicePaid &&
      updated.onboardingFormSubmitted &&
      updated.accessGranted &&
      updated.kickoffDone &&
      updated.firstDeliverableSent
    ) {
      await ctx.db.patch(id, { status: "ACTIVE" });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const contacts = await ctx.db.query("clientContacts").withIndex("by_clientId", (q) => q.eq("clientId", args.id)).take(100);
    for (const c of contacts) await ctx.db.delete(c._id);
    const notes = await ctx.db.query("clientNotes").withIndex("by_clientId", (q) => q.eq("clientId", args.id)).take(100);
    for (const n of notes) await ctx.db.delete(n._id);
    await ctx.db.delete(args.id);
  },
});

export const addContact = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    designation: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clientContacts", {
      clientId: args.clientId,
      name: args.name,
      email: args.email,
      whatsapp: args.whatsapp,
      designation: args.designation,
      isPrimary: args.isPrimary ?? false,
    });
  },
});

export const addNote = mutation({
  args: {
    clientId: v.id("clients"),
    content: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clientNotes", {
      clientId: args.clientId,
      content: args.content,
      createdBy: args.createdBy,
    });
  },
});
