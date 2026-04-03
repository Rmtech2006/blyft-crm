import { query } from "./_generated/server";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const [clients, projects, leads, transactions, activityLogs, reimbursements] = await Promise.all([
      ctx.db.query("clients").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("leads").collect(),
      ctx.db.query("transactions").filter((q) => q.eq(q.field("type"), "INCOME")).collect(),
      ctx.db.query("activityLogs").order("desc").take(8),
      ctx.db.query("reimbursements").filter((q) => q.eq(q.field("status"), "PENDING")).collect(),
    ]);

    const totalClients = clients.filter((c) => c.status === "ACTIVE").length;
    const activeProjects = projects.filter((p) =>
      ["IN_PROGRESS", "NOT_STARTED", "IN_REVIEW"].includes(p.status)
    ).length;
    const openLeads = leads.filter((l) => !["WON", "LOST"].includes(l.stage)).length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthlyRevenue = transactions
      .filter((t) => t.date >= startOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalClients,
      activeProjects,
      openLeads,
      monthlyRevenue,
      recentActivity: activityLogs.map((log) => ({
        ...log,
        id: log._id,
        createdAt: log._creationTime,
        user: null,
      })),
      pendingReimbursements: reimbursements.length,
    };
  },
});
