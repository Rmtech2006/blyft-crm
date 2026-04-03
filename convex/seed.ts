import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing data
    const tables = [
      "clients", "clientContacts", "clientNotes",
      "projects", "milestones", "projectTeamMembers",
      "tasks", "leads", "leadNotes", "leadCallLogs",
      "teamMembers", "reimbursements",
      "messageTemplates", "bankAccounts", "transactions",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) await ctx.db.delete(doc._id);
    }

    // ── Clients ──────────────────────────────────────────────────────────────
    const acme = await ctx.db.insert("clients", {
      companyName: "Acme Digital",
      industry: "E-commerce",
      status: "ACTIVE",
      retainerAmount: 50000,
      paymentTerms: "Net 15",
      startDate: new Date("2024-01-15").getTime(),
      website: "https://acmedigital.in",
      address: "Mumbai, Maharashtra",
    });

    const techCorp = await ctx.db.insert("clients", {
      companyName: "TechCorp Solutions",
      industry: "SaaS",
      status: "ACTIVE",
      retainerAmount: 75000,
      paymentTerms: "Net 30",
      startDate: new Date("2024-03-01").getTime(),
      website: "https://techcorp.io",
    });

    const freshMart = await ctx.db.insert("clients", {
      companyName: "FreshMart India",
      industry: "Food & Grocery",
      status: "PAUSED",
      retainerAmount: 30000,
    });

    await ctx.db.insert("clients", {
      companyName: "Sunrise Wellness",
      industry: "Health & Fitness",
      status: "PROSPECT",
    });

    // Client contacts
    await ctx.db.insert("clientContacts", {
      clientId: acme,
      name: "Rahul Mehta",
      designation: "Marketing Head",
      whatsapp: "+91 98765 43210",
      email: "rahul@acmedigital.in",
      isPrimary: true,
    });

    await ctx.db.insert("clientContacts", {
      clientId: techCorp,
      name: "Priya Sharma",
      designation: "CEO",
      whatsapp: "+91 87654 32109",
      email: "priya@techcorp.io",
      isPrimary: true,
    });

    // Client notes
    await ctx.db.insert("clientNotes", {
      clientId: acme,
      content: "Client prefers weekly updates on Fridays. Focus on Instagram reels performance.",
      createdBy: "ritish",
    });

    // ── Projects ─────────────────────────────────────────────────────────────
    const socialProj = await ctx.db.insert("projects", {
      name: "Acme Q2 Social Media",
      clientId: acme,
      type: "SOCIAL_MEDIA",
      status: "IN_PROGRESS",
      description: "Full social media management for Q2 2024 — Instagram, Facebook, LinkedIn",
      startDate: new Date("2024-04-01").getTime(),
      deadline: new Date("2024-06-30").getTime(),
      budgetAgreed: 150000,
    });

    const seoProj = await ctx.db.insert("projects", {
      name: "TechCorp SEO & Content",
      clientId: techCorp,
      type: "SEO",
      status: "IN_PROGRESS",
      description: "Technical SEO audit + monthly blog content",
      startDate: new Date("2024-03-15").getTime(),
      deadline: new Date("2024-09-30").getTime(),
      budgetAgreed: 200000,
    });

    await ctx.db.insert("projects", {
      name: "FreshMart Brand Refresh",
      clientId: freshMart,
      type: "BRANDING",
      status: "ON_HOLD",
      budgetAgreed: 80000,
    });

    // Milestones
    await ctx.db.insert("milestones", {
      projectId: socialProj,
      title: "Content Calendar Approval",
      dueDate: new Date("2024-04-10").getTime(),
      completed: true,
    });

    await ctx.db.insert("milestones", {
      projectId: socialProj,
      title: "April Campaign Launch",
      dueDate: new Date("2024-04-15").getTime(),
      completed: true,
    });

    await ctx.db.insert("milestones", {
      projectId: socialProj,
      title: "May Performance Review",
      dueDate: new Date("2024-05-31").getTime(),
      completed: false,
    });

    await ctx.db.insert("milestones", {
      projectId: seoProj,
      title: "Technical Audit Report",
      dueDate: new Date("2024-04-01").getTime(),
      completed: true,
    });

    // ── Team Members ─────────────────────────────────────────────────────────
    const designer = await ctx.db.insert("teamMembers", {
      fullName: "Ananya Patel",
      email: "ananya@blyft.in",
      phone: "+91 99887 76655",
      type: "FULL_TIME",
      status: "ACTIVE",
      department: "Design",
      skills: ["Figma", "Canva", "Illustration", "Video Editing"],
      compensationMode: "MONTHLY",
      compensationRate: 35000,
      startDate: new Date("2023-08-01").getTime(),
    });

    const contentWriter = await ctx.db.insert("teamMembers", {
      fullName: "Karan Verma",
      email: "karan@blyft.in",
      phone: "+91 98877 66554",
      type: "PART_TIME",
      status: "ACTIVE",
      department: "Content",
      skills: ["Copywriting", "SEO Writing", "Blog", "Email Marketing"],
      compensationMode: "MONTHLY",
      compensationRate: 18000,
      startDate: new Date("2024-01-01").getTime(),
    });

    await ctx.db.insert("teamMembers", {
      fullName: "Meera Joshi",
      email: "meera@blyft.in",
      type: "INTERN",
      status: "ACTIVE",
      department: "Marketing",
      skills: ["Social Media", "Content Creation"],
      compensationMode: "MONTHLY",
      compensationRate: 8000,
      startDate: new Date("2024-03-01").getTime(),
      college: "NMIMS Mumbai",
    });

    // Project team members
    await ctx.db.insert("projectTeamMembers", { projectId: socialProj, teamMemberId: designer });
    await ctx.db.insert("projectTeamMembers", { projectId: socialProj, teamMemberId: contentWriter });
    await ctx.db.insert("projectTeamMembers", { projectId: seoProj, teamMemberId: contentWriter });

    // ── Tasks ─────────────────────────────────────────────────────────────────
    await ctx.db.insert("tasks", {
      title: "Design May reel templates for Acme",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: socialProj,
      assigneeId: "ritish",
      dueDate: new Date("2024-05-05").getTime(),
      recurringType: "NONE",
    });

    await ctx.db.insert("tasks", {
      title: "Write 4 blog posts for TechCorp",
      status: "TODO",
      priority: "MEDIUM",
      projectId: seoProj,
      assigneeId: "eshaan",
      dueDate: new Date("2024-05-15").getTime(),
      recurringType: "MONTHLY",
    });

    await ctx.db.insert("tasks", {
      title: "Weekly client report — Acme",
      status: "TODO",
      priority: "MEDIUM",
      projectId: socialProj,
      assigneeId: "ritish",
      recurringType: "WEEKLY",
    });

    await ctx.db.insert("tasks", {
      title: "Review and approve content calendar",
      status: "DONE",
      priority: "HIGH",
      projectId: socialProj,
      assigneeId: "ritish",
      recurringType: "NONE",
    });

    await ctx.db.insert("tasks", {
      title: "Keyword research for TechCorp SEO",
      status: "DONE",
      priority: "HIGH",
      projectId: seoProj,
      assigneeId: "eshaan",
      recurringType: "NONE",
    });

    // ── Leads ─────────────────────────────────────────────────────────────────
    const lead1 = await ctx.db.insert("leads", {
      name: "UrbanStyle Fashion",
      company: "UrbanStyle Pvt Ltd",
      industry: "Fashion & Apparel",
      source: "INSTAGRAM",
      stage: "DISCOVERY",
      contactName: "Sneha Kapoor",
      whatsapp: "+91 97766 55443",
      email: "sneha@urbanstyle.in",
      estimatedValue: 60000,
      serviceType: "Social Media + Influencer",
      followUpDate: new Date("2024-05-10").getTime(),
      ownerId: "ritish",
    });

    await ctx.db.insert("leads", {
      name: "GreenEarth NGO",
      company: "GreenEarth Foundation",
      industry: "Non-profit",
      source: "REFERRAL",
      stage: "PROPOSAL_SENT",
      estimatedValue: 25000,
      serviceType: "Social Media Management",
      ownerId: "eshaan",
    });

    await ctx.db.insert("leads", {
      name: "Zara Fitness Studio",
      source: "LINKEDIN",
      stage: "CONTACTED",
      contactName: "Arjun Singh",
      whatsapp: "+91 96655 44332",
      estimatedValue: 45000,
      serviceType: "SEO + Content",
      ownerId: "ritish",
    });

    await ctx.db.insert("leads", {
      name: "BlueSky Travels",
      company: "BlueSky Travels LLP",
      source: "WEBSITE",
      stage: "WON",
      estimatedValue: 80000,
      serviceType: "Full Digital Marketing",
      ownerId: "eshaan",
    });

    // Lead notes
    await ctx.db.insert("leadNotes", {
      leadId: lead1,
      content: "Had discovery call. Very interested in Instagram growth and influencer campaigns. Budget confirmed.",
    });

    // Lead call logs
    await ctx.db.insert("leadCallLogs", {
      leadId: lead1,
      callDate: new Date("2024-04-28").getTime(),
      summary: "Discovery call — discussed Instagram strategy and influencer tie-ups. Follow up with proposal by May 10.",
    });

    // ── Reimbursements ───────────────────────────────────────────────────────
    await ctx.db.insert("reimbursements", {
      category: "TRAVEL",
      amount: 850,
      description: "Uber to Acme client meeting",
      date: new Date("2024-04-22").getTime(),
      status: "PAID",
      submittedById: "ritish",
      teamMemberId: undefined,
    });

    await ctx.db.insert("reimbursements", {
      category: "TOOLS_SOFTWARE",
      amount: 2500,
      description: "Canva Pro annual subscription",
      date: new Date("2024-04-15").getTime(),
      status: "APPROVED",
      submittedById: "eshaan",
      teamMemberId: designer,
    });

    await ctx.db.insert("reimbursements", {
      category: "FOOD_ENTERTAINMENT",
      amount: 1200,
      description: "Team lunch — Q1 review",
      date: new Date("2024-04-30").getTime(),
      status: "PENDING",
      submittedById: "ritish",
    });

    // ── Message Templates ─────────────────────────────────────────────────────
    await ctx.db.insert("messageTemplates", {
      title: "Monthly Report — Client",
      category: "CLIENT_COMMS",
      content: "Hi {{clientName}},\n\nHere's your monthly performance report for {{month}}.\n\n📊 Key Highlights:\n- Reach: {{reach}}\n- Engagement Rate: {{engagementRate}}%\n- New Followers: {{followers}}\n\nDetailed report: {{reportLink}}\n\nLet us know if you have any questions!\n\nWarm regards,\nBLYFT Team",
      variables: ["clientName", "month", "reach", "engagementRate", "followers", "reportLink"],
      isLocked: false,
      usageCount: 8,
    });

    await ctx.db.insert("messageTemplates", {
      title: "Lead Follow-up — Post Discovery",
      category: "LEAD_FOLLOWUP",
      content: "Hi {{name}},\n\nThank you for taking the time to speak with us today! It was great learning about {{company}} and your goals.\n\nAs discussed, we'll be sending over a customised proposal for {{service}} by {{proposalDate}}.\n\nFeel free to reach out if you have any questions in the meantime.\n\nBest,\n{{agentName}}\nBLYFT",
      variables: ["name", "company", "service", "proposalDate", "agentName"],
      isLocked: false,
      usageCount: 15,
    });

    await ctx.db.insert("messageTemplates", {
      title: "Invoice Payment Reminder",
      category: "FINANCE",
      content: "Hi {{clientName}},\n\nThis is a friendly reminder that Invoice #{{invoiceNo}} for ₹{{amount}} was due on {{dueDate}}.\n\nKindly process the payment at your earliest convenience.\n\nBank details:\nAccount: BLYFT Digital LLP\nAccount No: XXXX XXXX 4521\nIFSC: HDFC0001234\n\nThank you!",
      variables: ["clientName", "invoiceNo", "amount", "dueDate"],
      isLocked: true,
      usageCount: 22,
    });

    // ── Bank Accounts ─────────────────────────────────────────────────────────
    const mainAccount = await ctx.db.insert("bankAccounts", {
      name: "BLYFT Operations",
      bankName: "HDFC Bank",
      accountNumber: "xxxx xxxx 4521",
      balance: 285000,
      lastUpdated: Date.now(),
      isActive: true,
    });

    await ctx.db.insert("bankAccounts", {
      name: "BLYFT Savings",
      bankName: "ICICI Bank",
      accountNumber: "xxxx xxxx 9873",
      balance: 120000,
      lastUpdated: Date.now(),
      isActive: true,
    });

    // ── Transactions ─────────────────────────────────────────────────────────
    await ctx.db.insert("transactions", {
      type: "INCOME",
      amount: 50000,
      category: "Client Retainer",
      description: "Acme Digital — April retainer",
      date: new Date("2024-04-01").getTime(),
      paymentMode: "BANK_TRANSFER",
      bankAccountId: mainAccount,
      clientId: acme,
      gstTagged: true,
      gstAmount: 9000,
    });

    await ctx.db.insert("transactions", {
      type: "INCOME",
      amount: 75000,
      category: "Client Retainer",
      description: "TechCorp Solutions — April retainer",
      date: new Date("2024-04-03").getTime(),
      paymentMode: "BANK_TRANSFER",
      bankAccountId: mainAccount,
      clientId: techCorp,
      gstTagged: true,
      gstAmount: 13500,
    });

    await ctx.db.insert("transactions", {
      type: "EXPENSE",
      amount: 35000,
      category: "Salary",
      description: "Ananya Patel — April salary",
      date: new Date("2024-04-30").getTime(),
      paymentMode: "BANK_TRANSFER",
      bankAccountId: mainAccount,
      gstTagged: false,
    });

    await ctx.db.insert("transactions", {
      type: "EXPENSE",
      amount: 5500,
      category: "Tools & Software",
      description: "Adobe Creative Cloud + Hootsuite",
      date: new Date("2024-04-05").getTime(),
      paymentMode: "CARD",
      bankAccountId: mainAccount,
      gstTagged: false,
    });

    await ctx.db.insert("transactions", {
      type: "INCOME",
      amount: 20000,
      category: "Project Payment",
      description: "FreshMart — Brand strategy deposit",
      date: new Date("2024-04-10").getTime(),
      paymentMode: "UPI",
      bankAccountId: mainAccount,
      clientId: freshMart,
      gstTagged: false,
    });

    return { success: true, message: "Seed data inserted successfully!" };
  },
});
