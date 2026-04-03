import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("teamMembers").order("desc").collect();
    return await Promise.all(
      members.map(async (member) => {
        const ptms = await ctx.db
          .query("projectTeamMembers")
          .withIndex("by_teamMemberId", (q) => q.eq("teamMemberId", member._id))
          .collect();
        const projects = await Promise.all(
          ptms.map(async (ptm) => {
            const project = await ctx.db.get(ptm.projectId);
            return project ? { project: { id: project._id, name: project.name } } : null;
          })
        );
        return {
          ...member,
          id: member._id,
          projects: projects.filter(Boolean),
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    if (!member) return null;
    const ptms = await ctx.db
      .query("projectTeamMembers")
      .withIndex("by_teamMemberId", (q) => q.eq("teamMemberId", args.id))
      .collect();
    const projects = await Promise.all(
      ptms.map(async (ptm) => {
        const project = await ctx.db.get(ptm.projectId);
        return project
          ? { project: { id: project._id, name: project.name, status: project.status, type: project.type } }
          : null;
      })
    );
    const reimbursements = await ctx.db
      .query("reimbursements")
      .withIndex("by_teamMemberId", (q) => q.eq("teamMemberId", args.id))
      .collect();
    return {
      ...member,
      id: member._id,
      projects: projects.filter(Boolean),
      reimbursements: reimbursements.map((r) => ({ ...r, id: r._id })),
    };
  },
});

export const create = mutation({
  args: {
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    college: v.optional(v.string()),
    location: v.optional(v.string()),
    type: v.union(
      v.literal("INTERN"), v.literal("FREELANCER"), v.literal("PART_TIME"), v.literal("FULL_TIME")
    ),
    department: v.optional(v.string()),
    startDate: v.optional(v.number()),
    compensationMode: v.optional(v.union(
      v.literal("HOURLY"), v.literal("MONTHLY"), v.literal("PROJECT_BASED")
    )),
    compensationRate: v.optional(v.number()),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teamMembers", {
      fullName: args.fullName,
      phone: args.phone,
      email: args.email,
      college: args.college,
      location: args.location,
      type: args.type,
      status: "ACTIVE",
      department: args.department,
      startDate: args.startDate,
      compensationMode: args.compensationMode,
      compensationRate: args.compensationRate,
      skills: args.skills ?? [],
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("teamMembers"),
    fullName: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("INTERN"), v.literal("FREELANCER"), v.literal("PART_TIME"), v.literal("FULL_TIME")
    )),
    status: v.optional(v.union(
      v.literal("ACTIVE"), v.literal("ON_LEAVE"), v.literal("OFFBOARDED")
    )),
    compensationMode: v.optional(v.union(
      v.literal("HOURLY"), v.literal("MONTHLY"), v.literal("PROJECT_BASED")
    )),
    compensationRate: v.optional(v.number()),
    department: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const ptms = await ctx.db.query("projectTeamMembers").withIndex("by_teamMemberId", (q) => q.eq("teamMemberId", args.id)).collect();
    for (const ptm of ptms) await ctx.db.delete(ptm._id);
    await ctx.db.delete(args.id);
  },
});
