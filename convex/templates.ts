import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("messageTemplates").order("desc").take(200);
    return templates.map((t) => ({ ...t, id: t._id }));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    category: v.union(
      v.literal("CLIENT_COMMS"), v.literal("LEAD_FOLLOWUP"), v.literal("INTERNAL"),
      v.literal("FINANCE"), v.literal("SOCIAL"), v.literal("PROPOSAL")
    ),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const variables = extractVariables(args.content);
    return await ctx.db.insert("messageTemplates", {
      title: args.title,
      category: args.category,
      content: args.content,
      variables,
      isLocked: false,
      usageCount: 0,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("messageTemplates"),
    title: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("CLIENT_COMMS"), v.literal("LEAD_FOLLOWUP"), v.literal("INTERNAL"),
      v.literal("FINANCE"), v.literal("SOCIAL"), v.literal("PROPOSAL")
    )),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (args.content && args.content !== existing.content) {
      await ctx.db.insert("templateVersions", {
        templateId: args.id,
        content: existing.content,
      });
    }
    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.category !== undefined) patch.category = args.category;
    if (args.content !== undefined) {
      patch.content = args.content;
      patch.variables = extractVariables(args.content);
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("messageTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (template?.isLocked) throw new Error("Cannot delete a locked template");
    const versions = await ctx.db.query("templateVersions").withIndex("by_templateId", (q) => q.eq("templateId", args.id)).take(50);
    for (const v of versions) await ctx.db.delete(v._id);
    await ctx.db.delete(args.id);
  },
});

export const incrementUsage = mutation({
  args: { id: v.id("messageTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return;
    await ctx.db.patch(args.id, { usageCount: template.usageCount + 1 });
  },
});

export const toggleLock = mutation({
  args: { id: v.id("messageTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return;
    await ctx.db.patch(args.id, { isLocked: !template.isLocked });
  },
});

export const getVersions = query({
  args: { id: v.id("messageTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("templateVersions")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.id))
      .order("desc")
      .take(50);
  },
});

export const restoreVersion = mutation({
  args: { templateId: v.id("messageTemplates"), content: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return;
    await ctx.db.insert("templateVersions", {
      templateId: args.templateId,
      content: template.content,
    });
    const variables = [...new Set(
      (args.content.match(/\{\{(\w+)\}\}/g) ?? []).map((m) => m.replace(/[{}]/g, ""))
    )];
    await ctx.db.patch(args.templateId, { content: args.content, variables });
  },
});
