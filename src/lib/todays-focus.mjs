const EMPTY_COUNTS = {
  overdueTasks: 0,
  dueLeadFollowUps: 0,
  staleProposals: 0,
  highValueLeads: 0,
  dueProjectDeadlines: 0,
};

export const EMPTY_TODAYS_FOCUS = {
  generatedAt: 0,
  counts: EMPTY_COUNTS,
  overdueTasks: [],
  dueLeadFollowUps: [],
  staleProposals: [],
  highValueLeads: [],
  dueProjectDeadlines: [],
};

function asObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function asNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeTodaysFocus(value) {
  const source = asObject(value);
  if (!source) return EMPTY_TODAYS_FOCUS;

  const counts = asObject(source.counts);

  return {
    generatedAt: asNumber(source.generatedAt),
    counts: {
      overdueTasks: asNumber(counts?.overdueTasks),
      dueLeadFollowUps: asNumber(counts?.dueLeadFollowUps),
      staleProposals: asNumber(counts?.staleProposals),
      highValueLeads: asNumber(counts?.highValueLeads),
      dueProjectDeadlines: asNumber(counts?.dueProjectDeadlines),
    },
    overdueTasks: asArray(source.overdueTasks),
    dueLeadFollowUps: asArray(source.dueLeadFollowUps),
    staleProposals: asArray(source.staleProposals),
    highValueLeads: asArray(source.highValueLeads),
    dueProjectDeadlines: asArray(source.dueProjectDeadlines),
  };
}
