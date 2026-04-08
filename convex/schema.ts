import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  clients: defineTable({
    companyName: v.string(),
    industry: v.optional(v.string()),
    gstNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.union(v.literal("ACTIVE"), v.literal("PAUSED"), v.literal("COMPLETED"), v.literal("PROSPECT")),
    retainerAmount: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    contractFile: v.optional(v.string()),
    startDate: v.optional(v.number()),
    retainerEndDate: v.optional(v.number()),
    healthScore: v.optional(v.number()),
  }).index("by_status", ["status"]),

  clientContacts: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    designation: v.optional(v.string()),
    isPrimary: v.boolean(),
  }).index("by_clientId", ["clientId"]),

  clientNotes: defineTable({
    clientId: v.id("clients"),
    content: v.string(),
    createdBy: v.string(),
  }).index("by_clientId", ["clientId"]),

  projects: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("SOCIAL_MEDIA"), v.literal("SEO"), v.literal("WEB_DESIGN"),
      v.literal("BRANDING"), v.literal("CONTENT"), v.literal("ADS"), v.literal("OTHER")
    ),
    description: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    briefLink: v.optional(v.string()),
    status: v.union(
      v.literal("NOT_STARTED"), v.literal("IN_PROGRESS"), v.literal("IN_REVIEW"),
      v.literal("COMPLETED"), v.literal("ON_HOLD")
    ),
    startDate: v.optional(v.number()),
    deadline: v.optional(v.number()),
    budgetAgreed: v.optional(v.number()),
    costIncurred: v.optional(v.number()),
    driveFolder: v.optional(v.string()),
    clientId: v.id("clients"),
  }).index("by_clientId", ["clientId"])
    .index("by_status", ["status"]),

  milestones: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    dueDate: v.number(),
    completed: v.boolean(),
  }).index("by_projectId", ["projectId"]),

  projectTeamMembers: defineTable({
    projectId: v.id("projects"),
    teamMemberId: v.id("teamMembers"),
  }).index("by_projectId", ["projectId"])
    .index("by_teamMemberId", ["teamMemberId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("TODO"), v.literal("IN_PROGRESS"), v.literal("IN_REVIEW"),
      v.literal("DONE"), v.literal("BLOCKED")
    ),
    priority: v.union(
      v.literal("CRITICAL"), v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW")
    ),
    dueDate: v.optional(v.number()),
    dueTime: v.optional(v.string()),
    recurringType: v.union(
      v.literal("DAILY"), v.literal("WEEKLY"), v.literal("MONTHLY"), v.literal("NONE")
    ),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.string()),
    createdById: v.optional(v.string()),
  }).index("by_projectId", ["projectId"])
    .index("by_status", ["status"]),

  leads: defineTable({
    name: v.string(),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    source: v.union(
      v.literal("INSTAGRAM"), v.literal("REFERRAL"), v.literal("LINKEDIN"),
      v.literal("COLD_EMAIL"), v.literal("EVENT"), v.literal("WEBSITE"), v.literal("OTHER")
    ),
    stage: v.union(
      v.literal("NEW_LEAD"), v.literal("CONTACTED"), v.literal("DISCOVERY"),
      v.literal("PROPOSAL_SENT"), v.literal("NEGOTIATION"), v.literal("WON"), v.literal("LOST")
    ),
    contactName: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    serviceType: v.optional(v.string()),
    followUpDate: v.optional(v.number()),
    lostReason: v.optional(v.string()),
    convertedClientId: v.optional(v.id("clients")),
    ownerId: v.optional(v.string()),
  }).index("by_stage", ["stage"]),

  leadNotes: defineTable({
    leadId: v.id("leads"),
    content: v.string(),
  }).index("by_leadId", ["leadId"]),

  leadCallLogs: defineTable({
    leadId: v.id("leads"),
    summary: v.string(),
    callDate: v.number(),
  }).index("by_leadId", ["leadId"]),

  teamMembers: defineTable({
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    college: v.optional(v.string()),
    location: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    type: v.union(
      v.literal("INTERN"), v.literal("FREELANCER"), v.literal("PART_TIME"), v.literal("FULL_TIME")
    ),
    status: v.union(
      v.literal("ACTIVE"), v.literal("ON_LEAVE"), v.literal("OFFBOARDED")
    ),
    department: v.optional(v.string()),
    reportingTo: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    compensationMode: v.optional(v.union(
      v.literal("HOURLY"), v.literal("MONTHLY"), v.literal("PROJECT_BASED")
    )),
    compensationRate: v.optional(v.number()),
    paymentMode: v.optional(v.string()),
    bankDetails: v.optional(v.string()),
    upiId: v.optional(v.string()),
    contractStatus: v.optional(v.string()),
    contractFile: v.optional(v.string()),
    ndaStatus: v.optional(v.string()),
    contractExpiry: v.optional(v.number()),
    skills: v.array(v.string()),
    performanceNotes: v.optional(v.string()),
  }).index("by_status", ["status"]),

  reimbursements: defineTable({
    category: v.union(
      v.literal("TRAVEL"), v.literal("FOOD_ENTERTAINMENT"), v.literal("TOOLS_SOFTWARE"),
      v.literal("OFFICE_SUPPLIES"), v.literal("AD_SPEND"), v.literal("MISCELLANEOUS")
    ),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    receiptUrl: v.optional(v.string()),
    receiptStorageId: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("PAID")
    ),
    payoutStatus: v.optional(v.string()),
    rejectionNote: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    submittedById: v.string(),
    teamMemberId: v.optional(v.id("teamMembers")),
    approverId: v.optional(v.string()),
  }).index("by_status", ["status"])
    .index("by_teamMemberId", ["teamMemberId"]),

  messageTemplates: defineTable({
    title: v.string(),
    category: v.union(
      v.literal("CLIENT_COMMS"), v.literal("LEAD_FOLLOWUP"), v.literal("INTERNAL"),
      v.literal("FINANCE"), v.literal("SOCIAL"), v.literal("PROPOSAL")
    ),
    content: v.string(),
    variables: v.array(v.string()),
    isLocked: v.boolean(),
    usageCount: v.number(),
  }),

  templateVersions: defineTable({
    templateId: v.id("messageTemplates"),
    content: v.string(),
  }).index("by_templateId", ["templateId"]),

  bankAccounts: defineTable({
    name: v.string(),
    accountNumber: v.string(),
    bankName: v.string(),
    balance: v.number(),
    lastUpdated: v.number(),
    isActive: v.boolean(),
  }),

  transactions: defineTable({
    type: v.union(v.literal("INCOME"), v.literal("EXPENSE")),
    amount: v.number(),
    category: v.string(),
    description: v.string(),
    date: v.number(),
    paymentMode: v.union(
      v.literal("CASH"), v.literal("UPI"), v.literal("BANK_TRANSFER"),
      v.literal("CHEQUE"), v.literal("CARD"), v.literal("OTHER")
    ),
    gstTagged: v.boolean(),
    gstAmount: v.optional(v.number()),
    bankAccountId: v.optional(v.id("bankAccounts")),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
  }).index("by_type", ["type"])
    .index("by_bankAccountId", ["bankAccountId"])
    .index("by_clientId", ["clientId"])
    .index("by_date", ["date"]),

  activityLogs: defineTable({
    entity: v.string(),
    entityId: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
    userId: v.optional(v.string()),
  }),

  notifications: defineTable({
    userId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    read: v.boolean(),
    link: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  subtasks: defineTable({
    taskId: v.id("tasks"),
    title: v.string(),
    completed: v.boolean(),
    order: v.number(),
  }).index("by_taskId", ["taskId"]),

  taskComments: defineTable({
    taskId: v.id("tasks"),
    content: v.string(),
    authorId: v.string(),
    authorName: v.string(),
  }).index("by_taskId", ["taskId"]),

  pettyCash: defineTable({
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("IN"), v.literal("OUT")),
    date: v.number(),
    category: v.string(),
    addedBy: v.string(),
  }),
});
