import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId, requireIdentity } from "./auth";

const USERS: Record<string, { id: string; name: string; email: string }> = {
  ritish: { id: "ritish", name: "Ritish", email: "ritish@blyftit.com" },
  eshaan: { id: "eshaan", name: "Eshaan", email: "eshaan@blyftit.com" },
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").order("desc").take(250);
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
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.id))
      .collect();
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.id))
      .order("asc")
      .collect();
    return {
      ...task,
      id: task._id,
      project: project ? { id: project._id, name: project.name } : null,
      assignee: task.assigneeId ? (USERS[task.assigneeId] ?? null) : null,
      subtasks: subtasks.map((s) => ({ ...s, id: s._id })).sort((a, b) => a.order - b.order),
      comments: comments.map((c) => ({ ...c, id: c._id, createdAt: c._creationTime })),
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
  },
  handler: async (ctx, args) => {
    const createdById = await getCurrentUserId(ctx);
    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status ?? "TODO",
      priority: args.priority ?? "MEDIUM",
      dueDate: args.dueDate,
      recurringType: args.recurringType ?? "NONE",
      projectId: args.projectId,
      assigneeId: args.assigneeId,
      createdById,
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

// ── Subtasks ──────────────────────────────────────────────────────────────────

export const addSubtask = mutation({
  args: { taskId: v.id("tasks"), title: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subtasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .take(100);
    return await ctx.db.insert("subtasks", {
      taskId: args.taskId,
      title: args.title,
      completed: false,
      order: existing.length,
    });
  },
});

export const toggleSubtask = mutation({
  args: { id: v.id("subtasks"), completed: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { completed: args.completed });
  },
});

export const removeSubtask = mutation({
  args: { id: v.id("subtasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Comments ──────────────────────────────────────────────────────────────────

export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    return await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      content: args.content,
      authorId: identity.subject,
      authorName: identity.name ?? identity.email ?? "User",
    });
  },
});

export const removeComment = mutation({
  args: { id: v.id("taskComments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
