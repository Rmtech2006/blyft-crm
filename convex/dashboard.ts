import { query } from "./_generated/server";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const getStats = query({
  args: {},
  handler: async (ctx) => {
const nowDate = new Date();
const currentMonthKey = getMonthKey(nowDate);
const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
const now = Date.now();
const SIX_MONTH_WINDOW = new Date(nowDate.getFullYear(), nowDate.getMonth() - 5, 1).getTime();

    const [
      clients,
      projects,
      leads,
      incomeTransactions,
      activityLogs,
      reimbursements,
      tasks,
      currentMonthTargets,
      overallTargets,
    ] = await Promise.all([
      ctx.db.query("clients").order("desc").take(250),
      ctx.db.query("projects").order("desc").take(250),
      ctx.db.query("leads").order("desc").take(250),
      ctx.db
        .query("transactions")
        .withIndex("by_type", (q) => q.eq("type", "INCOME"))
        .order("desc")
        .take(500),
      ctx.db.query("activityLogs").order("desc").take(8),
      ctx.db.query("reimbursements").withIndex("by_status", (q) => q.eq("status", "PENDING")).take(100),
      ctx.db.query("tasks").withIndex("by_status", (q) => q.eq("status", "TODO")).take(200),
      ctx.db.query("salesTargets").withIndex("by_monthKey", (q) => q.eq("monthKey", currentMonthKey)).take(50),
      ctx.db.query("salesTargets").withIndex("by_scopeType_and_monthKey", (q) => q.eq("scopeType", "OVERALL")).take(24),
    ]);

    const additionalTasks = await Promise.all([
      ctx.db.query("tasks").withIndex("by_status", (q) => q.eq("status", "IN_PROGRESS")).take(200),
      ctx.db.query("tasks").withIndex("by_status", (q) => q.eq("status", "IN_REVIEW")).take(200),
    ]);
    const activeTasks = [...tasks, ...additionalTasks.flat()];
    const sixMonthIncomeTransactions = incomeTransactions.filter(
      (transaction) => transaction.date >= SIX_MONTH_WINDOW
    );

    const totalClients = clients.filter((client) => client.status === "ACTIVE").length;
    const activeProjects = projects.filter((project) =>
      ["IN_PROGRESS", "NOT_STARTED", "IN_REVIEW"].includes(project.status)
    ).length;
    const openLeads = leads.filter((lead) => !["PROPOSAL_ACCEPTED", "LOST"].includes(lead.stage)).length;
    const monthlyRevenue = sixMonthIncomeTransactions
      .filter((transaction) => transaction.date >= startOfMonth)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const overdueCount = activeTasks.filter((task) => task.dueDate && task.dueDate < now).length;

    const memberIds = [
      ...new Set(
        currentMonthTargets.flatMap((target) => (target.teamMemberId ? [target.teamMemberId] : []))
      ),
    ];
    const members = await Promise.all(memberIds.map((memberId) => ctx.db.get(memberId)));
    const memberNameMap = new Map(
      members.filter(Boolean).map((member) => [member!._id, member!.fullName])
    );

    const overallTarget = currentMonthTargets.find((target) => target.scopeType === "OVERALL") ?? null;

    const overallTargetMap = new Map<string, { targetAmount: number; updatedAt: number }>();
    for (const target of overallTargets) {
      const existing = overallTargetMap.get(target.monthKey);
      if (!existing || target.updatedAt >= existing.updatedAt) {
        overallTargetMap.set(target.monthKey, {
          targetAmount: target.targetAmount,
          updatedAt: target.updatedAt,
        });
      }
    }

    const monthlyRevenueTrend: { month: string; income: number; target: number }[] = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(nowDate.getFullYear(), nowDate.getMonth() - index, 1);
      const monthKey = getMonthKey(date);
      const start = date.getTime();
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();
      const income = sixMonthIncomeTransactions
        .filter((transaction) => transaction.date >= start && transaction.date <= end)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      monthlyRevenueTrend.push({
        month: date.toLocaleString("en-IN", { month: "short" }),
        income,
        target: overallTargetMap.get(monthKey)?.targetAmount ?? 0,
      });
    }

    const salesTargets = currentMonthTargets
      .filter((target) => target.scopeType !== "OVERALL")
      .map((target) => {
        const actualAmount = target.actualAmount ?? 0;
        const label =
          target.scopeType === "DEPARTMENT"
            ? target.department ?? "Department"
            : memberNameMap.get(target.teamMemberId!) ?? "Team member";

        return {
          id: target._id,
          scopeType: target.scopeType,
          label,
          targetAmount: target.targetAmount,
          actualAmount,
          progress: target.targetAmount > 0 ? Math.round((actualAmount / target.targetAmount) * 100) : 0,
        };
      })
      .sort((a, b) => {
        if (a.scopeType !== b.scopeType) {
          return a.scopeType === "DEPARTMENT" ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      });

    return {
      currentMonthKey,
      totalClients,
      activeProjects,
      openLeads,
      monthlyRevenue,
      overdueCount,
      monthlyRevenueTrend,
      salesTarget: overallTarget
        ? {
            id: overallTarget._id,
            monthKey: overallTarget.monthKey,
            label: "Overall business",
            targetAmount: overallTarget.targetAmount,
            actualAmount: monthlyRevenue,
            progress:
              overallTarget.targetAmount > 0
                ? Math.round((monthlyRevenue / overallTarget.targetAmount) * 100)
                : 0,
          }
        : null,
      salesTargets,
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
