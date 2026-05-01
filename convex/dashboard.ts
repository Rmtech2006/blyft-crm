import { query } from "./_generated/server";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const NON_OPERATING_INCOME_CATEGORIES = new Set([
  "bank interest",
  "non-operating income",
  "non operating income",
]);
const ACTIVE_PROJECT_STATUSES = ["IN_PROGRESS", "NOT_STARTED", "IN_REVIEW"] as const;
const ACTIVE_TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW"] as const;
const OPEN_LEAD_STAGES = [
  "LEAD_CAPTURED",
  "QUALIFICATION_SUBMITTED",
  "STRATEGY_CALL",
  "PROPOSAL_SENT",
  "PROPOSAL_ACCEPTED",
  "NURTURE",
  "LOST",
] as const;

function isOperatingIncome(transaction: { category: string }) {
  return !NON_OPERATING_INCOME_CATEGORIES.has(transaction.category.trim().toLowerCase());
}

export const getStats = query({
  args: {},
  handler: async (ctx) => {
const nowDate = new Date();
const currentMonthKey = getMonthKey(nowDate);
const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
const now = Date.now();
const SIX_MONTH_WINDOW = new Date(nowDate.getFullYear(), nowDate.getMonth() - 5, 1).getTime();
const NEXT_MONTH_START = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1).getTime();

    const [
      clients,
      incomeTransactions,
      activityLogs,
      reimbursements,
      currentMonthTargets,
      overallTargets,
      projectBatches,
      leadBatches,
      activeTaskBatches,
    ] = await Promise.all([
      ctx.db.query("clients").order("desc").take(250),
      ctx.db
        .query("transactions")
        .withIndex("by_type_and_date", (q) =>
          q.eq("type", "INCOME").gt("date", SIX_MONTH_WINDOW - 1).lt("date", NEXT_MONTH_START)
        )
        .take(500),
      ctx.db.query("activityLogs").order("desc").take(8),
      ctx.db.query("reimbursements").withIndex("by_status", (q) => q.eq("status", "PENDING")).take(100),
      ctx.db.query("salesTargets").withIndex("by_monthKey", (q) => q.eq("monthKey", currentMonthKey)).take(50),
      ctx.db.query("salesTargets").withIndex("by_scopeType_and_monthKey", (q) => q.eq("scopeType", "OVERALL")).take(24),
      Promise.all(
        ACTIVE_PROJECT_STATUSES.map((status) =>
          ctx.db.query("projects").withIndex("by_status", (q) => q.eq("status", status)).take(100)
        )
      ),
      Promise.all(
        OPEN_LEAD_STAGES.map((stage) =>
          ctx.db.query("leads").withIndex("by_stage", (q) => q.eq("stage", stage)).take(100)
        )
      ),
      Promise.all(
        ACTIVE_TASK_STATUSES.map((status) =>
          ctx.db
            .query("tasks")
            .withIndex("by_status_and_dueDate", (q) => q.eq("status", status).lt("dueDate", now))
            .take(200)
        )
      ),
    ]);

    const projects = projectBatches.flat();
    const leads = leadBatches.flat();
    const activeTasks = activeTaskBatches.flat();
    const sixMonthIncomeTransactions = incomeTransactions.filter(
      (transaction) => transaction.date >= SIX_MONTH_WINDOW && isOperatingIncome(transaction)
    );

    const totalClients = clients.filter((client) => client.status === "ACTIVE").length;
    const activeProjects = projects.length;
    const openLeads = leads.length;
    const monthlyRevenue = sixMonthIncomeTransactions
      .filter((transaction) => transaction.date >= startOfMonth)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const overdueCount = activeTasks.length;

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
