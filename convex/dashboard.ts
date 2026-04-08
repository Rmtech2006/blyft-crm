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

    const nowDate = new Date();
    const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
    const monthlyRevenue = transactions
      .filter((t) => t.date >= startOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const now = Date.now();
    const overdueTasks = await ctx.db.query("tasks")
      .filter((q) => q.and(
        q.neq(q.field("status"), "DONE"),
        q.neq(q.field("status"), "BLOCKED"),
      ))
      .collect();
    const overdueCount = overdueTasks.filter((t) => t.dueDate && t.dueDate < now).length;

    // Monthly revenue for last 6 months
    const allIncome = await ctx.db.query("transactions")
      .filter((q) => q.eq(q.field("type"), "INCOME"))
      .collect();
    const monthlyRevenueTrend: { month: string; income: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      const label = d.toLocaleString("en-IN", { month: "short" });
      const income = allIncome.filter((t) => t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
      monthlyRevenueTrend.push({ month: label, income });
    }

    return {
      totalClients,
      activeProjects,
      openLeads,
      monthlyRevenue,
      overdueCount,
      monthlyRevenueTrend,
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
