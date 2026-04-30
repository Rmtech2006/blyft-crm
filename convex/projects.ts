import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").take(300);
    return await Promise.all(
      projects.map(async (project) => {
        const client = await ctx.db.get(project.clientId);
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
          .take(200);
        return {
          ...project,
          id: project._id,
          client: client ? { id: client._id, companyName: client.companyName } : { id: "", companyName: "Unknown" },
          taskCount: tasks.length,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;
    const client = await ctx.db.get(project.clientId);
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.id))
      .take(100);
    const ptms = await ctx.db
      .query("projectTeamMembers")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.id))
      .take(50);
    const teamMembers = await Promise.all(
      ptms.map(async (ptm) => {
        const member = await ctx.db.get(ptm.teamMemberId);
        return member ? { teamMember: { ...member, id: member._id } } : null;
      })
    );
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.id))
      .take(200);
    return {
      ...project,
      id: project._id,
      client: client ? { id: client._id, companyName: client.companyName } : null,
      milestones: milestones.map((m) => ({ ...m, id: m._id })),
      teamMembers: teamMembers.filter(Boolean),
      tasks: tasks.map((t) => ({ ...t, id: t._id })),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    clientId: v.id("clients"),
    type: v.union(
      v.literal("SOCIAL_MEDIA"), v.literal("SEO"), v.literal("WEB_DESIGN"),
      v.literal("BRANDING"), v.literal("CONTENT"), v.literal("ADS"), v.literal("OTHER")
    ),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("NOT_STARTED"), v.literal("IN_PROGRESS"), v.literal("IN_REVIEW"),
      v.literal("COMPLETED"), v.literal("ON_HOLD")
    )),
    startDate: v.optional(v.number()),
    deadline: v.optional(v.number()),
    budgetAgreed: v.optional(v.number()),
    driveFolder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      name: args.name,
      clientId: args.clientId,
      type: args.type,
      description: args.description,
      status: args.status ?? "NOT_STARTED",
      startDate: args.startDate,
      deadline: args.deadline,
      budgetAgreed: args.budgetAgreed,
      driveFolder: args.driveFolder,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    type: v.optional(v.union(
      v.literal("SOCIAL_MEDIA"), v.literal("SEO"), v.literal("WEB_DESIGN"),
      v.literal("BRANDING"), v.literal("CONTENT"), v.literal("ADS"), v.literal("OTHER")
    )),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("NOT_STARTED"), v.literal("IN_PROGRESS"), v.literal("IN_REVIEW"),
      v.literal("COMPLETED"), v.literal("ON_HOLD")
    )),
    startDate: v.optional(v.number()),
    deadline: v.optional(v.number()),
    budgetAgreed: v.optional(v.number()),
    driveFolder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const milestones = await ctx.db.query("milestones").withIndex("by_projectId", (q) => q.eq("projectId", args.id)).take(200);
    for (const m of milestones) await ctx.db.delete(m._id);
    const ptms = await ctx.db.query("projectTeamMembers").withIndex("by_projectId", (q) => q.eq("projectId", args.id)).take(50);
    for (const ptm of ptms) await ctx.db.delete(ptm._id);
    const tasks = await ctx.db.query("tasks").withIndex("by_projectId", (q) => q.eq("projectId", args.id)).take(200);
    for (const t of tasks) await ctx.db.delete(t._id);
    await ctx.db.delete(args.id);
  },
});

export const archive = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});

export const restore = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { archivedAt: undefined });
  },
});

export const addMilestone = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("milestones", {
      projectId: args.projectId,
      title: args.title,
      dueDate: args.dueDate,
      completed: false,
    });
  },
});

export const toggleMilestone = mutation({
  args: { id: v.id("milestones"), completed: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { completed: args.completed });
  },
});

export const updateMilestone = mutation({
  args: {
    id: v.id("milestones"),
    title: v.string(),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      title: args.title,
      dueDate: args.dueDate,
    });
  },
});

export const removeMilestone = mutation({
  args: { id: v.id("milestones") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const setTeamMembers = mutation({
  args: {
    projectId: v.id("projects"),
    teamMemberIds: v.array(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projectTeamMembers")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(50);

    const nextIds = new Set(args.teamMemberIds);

    for (const relation of existing) {
      if (!nextIds.has(relation.teamMemberId)) {
        await ctx.db.delete(relation._id);
      }
    }

    const currentIds = new Set(existing.map((relation) => relation.teamMemberId));

    for (const teamMemberId of args.teamMemberIds) {
      if (!currentIds.has(teamMemberId)) {
        await ctx.db.insert("projectTeamMembers", {
          projectId: args.projectId,
          teamMemberId,
        });
      }
    }
  },
});
