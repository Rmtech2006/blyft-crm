export type AutomationLead = {
  id?: string;
  _id?: string;
  name: string;
  contactName?: string;
  company?: string;
  email?: string;
  whatsapp?: string;
  stage?: string;
  followUpDate?: number;
  estimatedValue?: number;
  serviceType?: string;
  servicesRequired?: string;
};

export type AutomationTask = {
  id?: string;
  _id?: string;
  title: string;
  status?: string;
  priority?: string;
  dueDate?: number;
};

export type LeadDuplicateKeys = {
  emailKey: string | null;
  whatsappKey: string | null;
};

export type WhatsappMessage = {
  kind: "first_follow_up" | "proposal_reminder" | "revival";
  label: string;
  text: string;
  url: string | null;
};

export function getDefaultLeadFollowUpDate(nowMs?: number): number;
export function isTerminalLeadStage(stage?: string | null): boolean;
export function getDueLeadFollowUps<T extends AutomationLead>(leads: T[], nowMs?: number): T[];
export function getStaleProposalLeads<T extends AutomationLead>(
  leads: T[],
  nowMs?: number,
  staleAfterDays?: number
): T[];
export function getOverdueTasks<T extends AutomationTask>(tasks: T[], nowMs?: number): T[];
export function normalizeEmailKey(email?: string | null): string | null;
export function normalizeWhatsappKey(whatsapp?: string | null): string | null;
export function buildLeadDuplicateKeys(lead: Pick<AutomationLead, "email" | "whatsapp">): LeadDuplicateKeys;
export function toWhatsappLink(whatsapp?: string | null, text?: string): string | null;
export function buildLeadWhatsappMessages(lead: AutomationLead): WhatsappMessage[];
