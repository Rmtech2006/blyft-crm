import { mutation } from "./_generated/server";

// Maps legacy lead stages to the new BLYFT funnel stages.
const STAGE_MAP: Record<string, string> = {
  NEW_LEAD: "LEAD_CAPTURED",
  CONTACTED: "QUALIFICATION_SUBMITTED",
  DISCOVERY: "STRATEGY_CALL",
  NEGOTIATION: "PROPOSAL_SENT",
  WON: "PROPOSAL_ACCEPTED",
};

/**
 * Convert any leads with legacy stage values to the new BLYFT funnel stages.
 * Safe to run multiple times — already-migrated leads are skipped.
 */
export const migrateLeadStages = mutation({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();
    let migrated = 0;
    for (const lead of leads) {
      const next = STAGE_MAP[lead.stage];
      if (next) {
        await ctx.db.patch(lead._id, {
          stage: next as
            | "LEAD_CAPTURED"
            | "QUALIFICATION_SUBMITTED"
            | "STRATEGY_CALL"
            | "PROPOSAL_SENT"
            | "PROPOSAL_ACCEPTED"
            | "NURTURE"
            | "LOST",
        });
        migrated++;
      }
    }
    return { migrated, total: leads.length };
  },
});

/**
 * Insert the 7 BLYFT onboarding email templates if they're not already present.
 * Idempotent — matches by exact title.
 */
export const seedBlyftTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("messageTemplates").collect();
    const have = new Set(existing.map((t) => t.title));

    const templates: Array<{
      title: string;
      category:
        | "CLIENT_COMMS"
        | "LEAD_FOLLOWUP"
        | "INTERNAL"
        | "FINANCE"
        | "SOCIAL"
        | "PROPOSAL";
      content: string;
      variables: string[];
    }> = [
      {
        title: "BLYFT Welcome Email",
        category: "LEAD_FOLLOWUP",
        content:
          "Subject: Welcome to BLYFT. Let's get started.\n\nHi {{name}},\n\nThanks for reaching out to BLYFT.\n\nWe help businesses scale through tailored technology and marketing solutions. To understand your requirements better, please fill out the short onboarding form below.\n\nOnboarding Form: {{formLink}}\n\nOnce submitted, we will review the details and schedule a strategy call with you.\n\nBest,\nTeam BLYFT",
        variables: ["name", "formLink"],
      },
      {
        title: "BLYFT Strategy Call Booking",
        category: "LEAD_FOLLOWUP",
        content:
          "Subject: Let's schedule your strategy session\n\nHi {{name}},\n\nThanks for submitting your details.\n\nOur team has reviewed your requirements and would love to discuss the best strategy for your business.\n\nSchedule your call here: {{calendarLink}}\n\nDuring the call we will review your goals and recommend the best approach for your business.\n\nBest,\nTeam BLYFT",
        variables: ["name", "calendarLink"],
      },
      {
        title: "BLYFT Proposal Sent",
        category: "PROPOSAL",
        content:
          "Subject: Your BLYFT proposal\n\nHi {{name}},\n\nIt was great speaking with you earlier.\n\nBased on our discussion we have prepared a tailored proposal outlining the scope of work, strategy and timeline.\n\nProposal: {{proposalLink}}\n\nPlease review it and let us know if you have any questions.\n\nBest,\nTeam BLYFT",
        variables: ["name", "proposalLink"],
      },
      {
        title: "BLYFT Payment & Agreement",
        category: "CLIENT_COMMS",
        content:
          "Subject: Welcome to BLYFT – Next Steps\n\nHi {{name}},\n\nWe are excited to begin working with you.\n\nPlease complete the following steps to start the project:\n\n1. Sign the agreement: {{contractLink}}\n2. Complete the onboarding form: {{formLink}}\n3. Process the initial payment: {{invoiceLink}}\n\nOnce completed we will move your project into execution.\n\nBest,\nTeam BLYFT",
        variables: ["name", "contractLink", "formLink", "invoiceLink"],
      },
      {
        title: "BLYFT Access Request",
        category: "CLIENT_COMMS",
        content:
          "Subject: Access required to start your project\n\nHi {{name}},\n\nTo begin execution we will need access to the following platforms where applicable:\n\n- Website or hosting\n- Social media accounts\n- Ad accounts\n- Analytics tools\n\nPlease invite us at: team@blyft.com\n\nBest,\nTeam BLYFT",
        variables: ["name"],
      },
      {
        title: "BLYFT Project Kickoff",
        category: "CLIENT_COMMS",
        content:
          "Subject: Your BLYFT project has started\n\nHi {{name}},\n\nYour project has officially started.\n\nOur team has reviewed your onboarding details and has begun preparing the execution roadmap.\n\nYour primary contact will be: {{managerName}}\n\nYou will receive your first update shortly.\n\nBest,\nTeam BLYFT",
        variables: ["name", "managerName"],
      },
      {
        title: "BLYFT First Deliverables",
        category: "CLIENT_COMMS",
        content:
          "Subject: Your first project update\n\nHi {{name}},\n\nWe have prepared the initial deliverables for your project.\n\nYou can review them here: {{link}}\n\nPlease share your feedback so we can move into the next stage.\n\nBest,\nTeam BLYFT",
        variables: ["name", "link"],
      },
    ];

    let inserted = 0;
    for (const t of templates) {
      if (have.has(t.title)) continue;
      await ctx.db.insert("messageTemplates", {
        ...t,
        isLocked: true,
        usageCount: 0,
      });
      inserted++;
    }
    return { inserted, skipped: templates.length - inserted };
  },
});
