import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const USERS: Record<string, { id: string; name: string; email: string }> = {
  ritish: { id: "ritish", name: "Ritish", email: "ritish@blyftit.com" },
  eshaan: { id: "eshaan", name: "Eshaan", email: "eshaan@blyftit.com" },
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").order("desc").collect();
    return await Promise.all(
      tasks.map(async (task) => {
        const project = task.projectId ? await ctx.db.get(task.projectId) : null;
        const assignee = task.assigneeId ? (USERS[task.assigneeId] ?? null) : null;
        return {
          ...task,
          id: task._id,
          project: project ? { id: project._id, name: project.name } : null,
          assignee,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return null;
    const project = task.projectId ? await ctx.db.get(task.projectId) : null;
    const subtasks = await ctx.db.query("subtasks").withIndex("by_taskId", (q) => q.eq("taskId", args.id)).collect();
    return {
      ...task,
      id: task._id,
      project: project ? { id: project._id, name: project.name } : null,
      assignee: task.assigneeId ? (USERS[task.assigneeId] ?? null) : null,
      subtasks: subtasks.map((s) => ({ ...s, id: s._id })),
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("TODO"), v.literal("IN_PROGRESS"), v.literal("IN_REVIEW"),
      v.literal("DONE"), v.literal("BLOCKED")
    )),
    priority: v.optional(v.union(
      v.literal("CRITICAL"), v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW")
    )),
    dueDate: v.optional(v.number()),
    recurringType: v.optional(v.union(
      v.literal("DAILY"), v.literal("WEEKLY"), v.literal("MONTHLY"), v.literal("NONE")
    )),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.string()),
    createdById: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status ?? "TODO",
      priority: args.priority ?? "MEDIUM",
      dueDate: args.dueDate,
      recurringType: args.recurringType ?? "NONE",
      projectId: args.projectId,
      assigneeId: args.assigneeId,
      createdById: args.createdById,
    });
  },
});

export const updateStatus = mutation({
  args: { id: v.id("tasks"), status: v.union(
    v.literal("TODO"), v.literal("IN_PROGRESS"), v.literal("IN_REVIEW"),
    v.literal("DONE"), v.literal("BLOCKED")
  )},
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("TODO"), v.literal("IN_PROGRESS"), v.literal("IN_REVIEW"),
      v.literal("DONE"), v.literal("BLOCKED")
    )),
    priority: v.optional(v.union(
      v.literal("CRITICAL"), v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW")
    )),
    dueDate: v.optional(v.number()),
    assigneeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const listUsers = query({
  args: {},
  handler: async () => {
    return Object.values(USERS);
  },
});
