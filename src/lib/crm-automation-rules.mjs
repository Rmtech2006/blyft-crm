const DAY_MS = 24 * 60 * 60 * 1000;

const TERMINAL_LEAD_STAGES = new Set([
  "PROPOSAL_ACCEPTED",
  "LOST",
  "WON",
]);

const ACTIVE_TASK_STATUSES = new Set([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
]);

const PRIORITY_WEIGHT = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function getDefaultLeadFollowUpDate(nowMs = Date.now()) {
  return nowMs + DAY_MS;
}

export function isTerminalLeadStage(stage) {
  return TERMINAL_LEAD_STAGES.has(String(stage ?? ""));
}

function numericDate(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function priorityScore(value) {
  return PRIORITY_WEIGHT[String(value ?? "").toUpperCase()] ?? 0;
}

function valueScore(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getDueLeadFollowUps(leads, nowMs = Date.now()) {
  return leads
    .filter((lead) => {
      const followUpDate = numericDate(lead.followUpDate);
      return followUpDate !== null && followUpDate <= nowMs && !isTerminalLeadStage(lead.stage);
    })
    .sort((a, b) => {
      const dateDelta = numericDate(a.followUpDate) - numericDate(b.followUpDate);
      if (dateDelta !== 0) return dateDelta;
      return valueScore(b.estimatedValue) - valueScore(a.estimatedValue);
    });
}

export function getStaleProposalLeads(leads, nowMs = Date.now(), staleAfterDays = 2) {
  const staleBefore = nowMs - staleAfterDays * DAY_MS;
  return leads
    .filter((lead) => {
      const followUpDate = numericDate(lead.followUpDate);
      return lead.stage === "PROPOSAL_SENT" && followUpDate !== null && followUpDate <= staleBefore;
    })
    .sort((a, b) => numericDate(a.followUpDate) - numericDate(b.followUpDate));
}

export function getOverdueTasks(tasks, nowMs = Date.now()) {
  return tasks
    .filter((task) => {
      const dueDate = numericDate(task.dueDate);
      return dueDate !== null && dueDate < nowMs && ACTIVE_TASK_STATUSES.has(String(task.status ?? ""));
    })
    .sort((a, b) => {
      const priorityDelta = priorityScore(b.priority) - priorityScore(a.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return numericDate(a.dueDate) - numericDate(b.dueDate);
    });
}

export function getDueProjectDeadlines(projects, nowMs = Date.now(), dueWithinDays = 7) {
  const dueBefore = nowMs + dueWithinDays * DAY_MS;

  return projects
    .filter((project) => {
      const deadline = numericDate(project.deadline);
      return (
        deadline !== null &&
        deadline >= nowMs &&
        deadline <= dueBefore &&
        !project.archivedAt &&
        String(project.status ?? "") !== "COMPLETED"
      );
    })
    .sort((a, b) => numericDate(a.deadline) - numericDate(b.deadline));
}

export function normalizeEmailKey(email) {
  const value = String(email ?? "").trim().toLowerCase();
  return value.includes("@") ? value : null;
}

export function normalizeWhatsappKey(whatsapp) {
  const digits = String(whatsapp ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function buildLeadDuplicateKeys(lead) {
  return {
    emailKey: normalizeEmailKey(lead.email),
    whatsappKey: normalizeWhatsappKey(lead.whatsapp),
  };
}

export function toWhatsappLink(whatsapp, text) {
  const phone = normalizeWhatsappKey(whatsapp);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function leadPersonName(lead) {
  return String(lead.contactName || lead.name || "there").trim();
}

function leadServiceName(lead) {
  return String(lead.serviceType || lead.servicesRequired || "your requirement").trim();
}

export function buildLeadWhatsappMessages(lead) {
  const name = leadPersonName(lead);
  const service = leadServiceName(lead);
  const companySuffix = lead.company ? ` for ${lead.company}` : "";
  const messages = [
    {
      kind: "first_follow_up",
      label: "First follow-up",
      text: `Hi ${name}, just following up on ${service}${companySuffix}. Should we schedule a quick call today?`,
    },
    {
      kind: "proposal_reminder",
      label: "Proposal reminder",
      text: `Hi ${name}, checking if you had a chance to review the proposal for ${service}${companySuffix}. Happy to clarify anything.`,
    },
    {
      kind: "revival",
      label: "Revival nudge",
      text: `Hi ${name}, wanted to reconnect on ${service}${companySuffix}. Is this still something you want to move ahead with?`,
    },
  ];

  return messages.map((message) => ({
    ...message,
    url: toWhatsappLink(lead.whatsapp, message.text),
  }));
}
